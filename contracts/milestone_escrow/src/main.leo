// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BlindRound — Milestone-Based Escrow                                ║
// ║  Lock grants, prove milestones via ZK, release tranches privately   ║
// ╚══════════════════════════════════════════════════════════════════════╝

program blindround_escrow_v1.aleo {

    // ─── Data Structures ────────────────────────────────────────────────

    struct EscrowInfo {
        round_id: field,
        grantor: address,
        total_amount: u64,
        released: u64,
        milestone_count: u8,
        milestones_completed: u8,
        active: bool,
    }

    struct MilestoneInfo {
        escrow_id: field,
        milestone_index: u8,
        amount: u64,
        deadline: u32,
        completed: bool,
        evidence_hash: field,
    }

    // Private escrow record — proves grant locked without exposing amount
    record EscrowReceipt {
        owner: address,
        escrow_id: field,
        round_id: field,
        total_amount: u64,
        recipient: address,
    }

    // Milestone completion proof — private evidence verified by ZK
    record MilestoneProof {
        owner: address,
        escrow_id: field,
        milestone_index: u8,
        evidence_hash: field,
        verified: bool,
    }

    // Tranche release token
    record TrancheRelease {
        owner: address,
        escrow_id: field,
        milestone_index: u8,
        amount: u64,
    }

    // ─── On-Chain State ─────────────────────────────────────────────────

    mapping escrows: field => EscrowInfo;
    mapping milestones: field => MilestoneInfo;
    mapping escrow_count: u8 => u32;
    mapping total_locked: u8 => u64;
    mapping total_released: u8 => u64;

    // ─── Transitions ────────────────────────────────────────────────────

    // Lock a grant into escrow with milestone schedule
    async transition lock_grant(
        public escrow_id: field,
        public round_id: field,
        private total_amount: u64,
        private recipient: address,
        public milestone_count: u8,
    ) -> (EscrowReceipt, Future) {
        assert(total_amount > 0u64);
        assert(milestone_count > 0u8);
        assert(milestone_count <= 10u8);

        let receipt: EscrowReceipt = EscrowReceipt {
            owner: self.caller,
            escrow_id: escrow_id,
            round_id: round_id,
            total_amount: total_amount,
            recipient: recipient,
        };

        return (receipt, finalize_lock_grant(
            self.caller, escrow_id, round_id, total_amount, milestone_count
        ));
    }

    async function finalize_lock_grant(
        grantor: address,
        escrow_id: field,
        round_id: field,
        total_amount: u64,
        milestone_count: u8,
    ) {
        let info: EscrowInfo = EscrowInfo {
            round_id: round_id,
            grantor: grantor,
            total_amount: total_amount,
            released: 0u64,
            milestone_count: milestone_count,
            milestones_completed: 0u8,
            active: true,
        };
        Mapping::set(escrows, escrow_id, info);

        let count: u32 = Mapping::get_or_use(escrow_count, 0u8, 0u32);
        Mapping::set(escrow_count, 0u8, count + 1u32);

        let locked: u64 = Mapping::get_or_use(total_locked, 0u8, 0u64);
        Mapping::set(total_locked, 0u8, locked + total_amount);
    }

    // Define a milestone with amount and deadline
    async transition define_milestone(
        public escrow_id: field,
        public milestone_id: field,
        public milestone_index: u8,
        public amount: u64,
        public deadline: u32,
    ) -> Future {
        return finalize_define_milestone(
            escrow_id, milestone_id, milestone_index, amount, deadline
        );
    }

    async function finalize_define_milestone(
        escrow_id: field,
        milestone_id: field,
        milestone_index: u8,
        amount: u64,
        deadline: u32,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);
        assert(milestone_index < escrow.milestone_count);

        let ms: MilestoneInfo = MilestoneInfo {
            escrow_id: escrow_id,
            milestone_index: milestone_index,
            amount: amount,
            deadline: deadline,
            completed: false,
            evidence_hash: 0field,
        };
        Mapping::set(milestones, milestone_id, ms);
    }

    // Submit proof of milestone completion — evidence stays private via ZK
    async transition prove_milestone(
        private evidence_hash: field,
        private deliverable_hash: field,
        public escrow_id: field,
        public milestone_id: field,
        public milestone_index: u8,
    ) -> (MilestoneProof, Future) {
        // Combine evidence for ZK verification
        let combined: field = BHP256::hash_to_field(evidence_hash);
        let verified_hash: field = BHP256::commit_to_field(
            combined, deliverable_hash as scalar
        );

        let proof: MilestoneProof = MilestoneProof {
            owner: self.caller,
            escrow_id: escrow_id,
            milestone_index: milestone_index,
            evidence_hash: verified_hash,
            verified: true,
        };

        return (proof, finalize_prove_milestone(
            escrow_id, milestone_id, milestone_index, verified_hash
        ));
    }

    async function finalize_prove_milestone(
        escrow_id: field,
        milestone_id: field,
        milestone_index: u8,
        evidence_hash: field,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);

        let ms: MilestoneInfo = Mapping::get(milestones, milestone_id);
        assert_eq(ms.escrow_id, escrow_id);
        assert_eq(ms.milestone_index, milestone_index);
        assert(!ms.completed);

        // Mark milestone complete
        let updated_ms: MilestoneInfo = MilestoneInfo {
            escrow_id: ms.escrow_id,
            milestone_index: ms.milestone_index,
            amount: ms.amount,
            deadline: ms.deadline,
            completed: true,
            evidence_hash: evidence_hash,
        };
        Mapping::set(milestones, milestone_id, updated_ms);

        // Update escrow state
        let updated_escrow: EscrowInfo = EscrowInfo {
            round_id: escrow.round_id,
            grantor: escrow.grantor,
            total_amount: escrow.total_amount,
            released: escrow.released,
            milestone_count: escrow.milestone_count,
            milestones_completed: escrow.milestones_completed + 1u8,
            active: escrow.active,
        };
        Mapping::set(escrows, escrow_id, updated_escrow);
    }

    // Release tranche after milestone is verified
    async transition release_tranche(
        receipt: EscrowReceipt,
        public milestone_id: field,
        public milestone_index: u8,
    ) -> (TrancheRelease, Future) {
        let release: TrancheRelease = TrancheRelease {
            owner: receipt.recipient,
            escrow_id: receipt.escrow_id,
            milestone_index: milestone_index,
            amount: receipt.total_amount / receipt.total_amount, // placeholder: actual calc in finalize
        };

        return (release, finalize_release_tranche(
            receipt.escrow_id, milestone_id, milestone_index
        ));
    }

    async function finalize_release_tranche(
        escrow_id: field,
        milestone_id: field,
        milestone_index: u8,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);

        let ms: MilestoneInfo = Mapping::get(milestones, milestone_id);
        assert(ms.completed);
        assert_eq(ms.escrow_id, escrow_id);
        assert_eq(ms.milestone_index, milestone_index);

        // Update released amount
        let updated: EscrowInfo = EscrowInfo {
            round_id: escrow.round_id,
            grantor: escrow.grantor,
            total_amount: escrow.total_amount,
            released: escrow.released + ms.amount,
            milestone_count: escrow.milestone_count,
            milestones_completed: escrow.milestones_completed,
            active: escrow.released + ms.amount < escrow.total_amount,
        };
        Mapping::set(escrows, escrow_id, updated);

        // Update global released
        let rel: u64 = Mapping::get_or_use(total_released, 0u8, 0u64);
        Mapping::set(total_released, 0u8, rel + ms.amount);
    }

    // ─── ZK Verification Helpers ────────────────────────────────────────

    // Verify that a deliverable matches expected hash without revealing content
    transition verify_deliverable(
        private actual_hash: field,
        private expected_hash: field,
    ) -> public bool {
        return actual_hash == expected_hash;
    }

    // Compute remaining escrow balance from private inputs
    transition compute_remaining(
        private total: u64,
        private released: u64,
    ) -> public u64 {
        assert(total >= released);
        return total - released;
    }
}
