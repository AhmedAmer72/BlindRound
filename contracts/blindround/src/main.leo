import credits.aleo;

program blindround_proto.aleo {

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    @noupgrade
    async constructor() {}

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS & RECORDS — LAYER 1: FUNDING ROUND
    // ═══════════════════════════════════════════════════════════════════════

    struct RoundInfo {
        creator:       address,
        goal:          u64,
        deadline:      u32,
        matching_pool: u64,
        status:        u8,
        project_count: u8,
    }

    struct ProjectInfo {
        round_id:      field,
        applicant:     address,
        name_hash:     field,
        total_donated: u64,
        donor_count:   u32,
    }

    record DonationReceipt {
        owner:      address,
        round_id:   field,
        amount:     u64,
        project_id: field,
        nonce_hash: field,
    }

    record RoundAdmin {
        owner:    address,
        round_id: field,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS & RECORDS — LAYER 2: COMMITTEE VOTING
    // ═══════════════════════════════════════════════════════════════════════

    struct CommitteeConfig {
        round_id:     field,
        chair:        address,
        member_count: u8,
        max_score:    u8,
        voting_open:  bool,
    }

    struct ProjectScore {
        project_id:  field,
        total_score: u64,
        vote_count:  u32,
    }

    record Ballot {
        owner:       address,
        round_id:    field,
        project_id:  field,
        score:       u8,
        ballot_hash: field,
    }

    record CommitteeSeat {
        owner:        address,
        round_id:     field,
        member_index: u8,
        has_voted:    bool,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS & RECORDS — LAYER 3: MILESTONE ESCROW
    // ═══════════════════════════════════════════════════════════════════════

    struct EscrowInfo {
        round_id:             field,
        grantor:              address,
        total_amount:         u64,
        released:             u64,
        milestone_count:      u8,
        milestones_completed: u8,
        active:               bool,
    }

    struct MilestoneInfo {
        escrow_id:       field,
        milestone_index: u8,
        amount:          u64,
        deadline:        u32,
        completed:       bool,
        evidence_hash:   field,
    }

    record EscrowReceipt {
        owner:        address,
        escrow_id:    field,
        round_id:     field,
        total_amount: u64,
        recipient:    address,
    }

    record MilestoneProof {
        owner:           address,
        escrow_id:       field,
        milestone_index: u8,
        evidence_hash:   field,
        verified:        bool,
    }

    record TrancheRelease {
        owner:           address,
        escrow_id:       field,
        milestone_index: u8,
        amount:          u64,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 1
    // ═══════════════════════════════════════════════════════════════════════

    mapping rounds:               field => RoundInfo;
    mapping round_totals:         field => u64;
    mapping round_donor_count:    field => u32;
    mapping projects:             field => ProjectInfo;
    mapping project_donations:    field => u64;
    mapping project_donor_counts: field => u32;
    mapping global_round_count:   u8    => u32;
    mapping global_donation_vol:  u8    => u64;

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 2
    // ═══════════════════════════════════════════════════════════════════════

    mapping committees:      field => CommitteeConfig;
    mapping project_scores:  field => ProjectScore;
    mapping vote_counts:     field => u32;
    mapping revealed_scores: field => u64;

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 3
    // ═══════════════════════════════════════════════════════════════════════

    mapping escrows:      field => EscrowInfo;
    mapping milestones:   field => MilestoneInfo;
    mapping escrow_count: u8    => u32;
    mapping total_locked: u8    => u64;

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1 TRANSITIONS — FUNDING ROUND
    // ═══════════════════════════════════════════════════════════════════════

    async transition create_round(
        public round_id:      field,
        public goal:          u64,
        public deadline:      u32,
        public matching_pool: u64,
    ) -> (RoundAdmin, Future) {
        let admin: RoundAdmin = RoundAdmin {
            owner:    self.caller,
            round_id: round_id,
        };
        return (admin, finalize_create_round(
            self.caller, round_id, goal, deadline, matching_pool
        ));
    }

    async function finalize_create_round(
        creator:       address,
        round_id:      field,
        goal:          u64,
        deadline:      u32,
        matching_pool: u64,
    ) {
        let info: RoundInfo = RoundInfo {
            creator:       creator,
            goal:          goal,
            deadline:      deadline,
            matching_pool: matching_pool,
            status:        1u8,
            project_count: 0u8,
        };
        Mapping::set(rounds, round_id, info);
        Mapping::set(round_totals, round_id, 0u64);
        Mapping::set(round_donor_count, round_id, 0u32);
        let cnt: u32 = Mapping::get_or_use(global_round_count, 0u8, 0u32);
        Mapping::set(global_round_count, 0u8, cnt + 1u32);
    }

    async transition register_project(
        public round_id:   field,
        public project_id: field,
        public name_hash:  field,
    ) -> Future {
        return finalize_register_project(
            self.caller, round_id, project_id, name_hash
        );
    }

    async function finalize_register_project(
        applicant:  address,
        round_id:   field,
        project_id: field,
        name_hash:  field,
    ) {
        let round: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(round.status, 1u8);
        let proj: ProjectInfo = ProjectInfo {
            round_id:      round_id,
            applicant:     applicant,
            name_hash:     name_hash,
            total_donated: 0u64,
            donor_count:   0u32,
        };
        Mapping::set(projects, project_id, proj);
        Mapping::set(project_donations, project_id, 0u64);
        Mapping::set(project_donor_counts, project_id, 0u32);
        let updated: RoundInfo = RoundInfo {
            creator:       round.creator,
            goal:          round.goal,
            deadline:      round.deadline,
            matching_pool: round.matching_pool,
            status:        round.status,
            project_count: round.project_count + 1u8,
        };
        Mapping::set(rounds, round_id, updated);
    }

    // Donor spends a private credits record — real on-chain token transfer.
    // `amount` microcredits are moved from donor's private balance to the
    // program's public custody; change is returned as a new credits record.
    async transition donate(
        private cr:         credits.aleo/credits,
        private amount:     u64,
        public  round_id:   field,
        public  project_id: field,
        private salt:       field,
    ) -> (DonationReceipt, credits.aleo/credits, Future) {
        assert(amount > 0u64);
        let nonce_hash: field = BHP256::hash_to_field(salt);
        let receipt: DonationReceipt = DonationReceipt {
            owner:      self.caller,
            round_id:   round_id,
            amount:     amount,
            project_id: project_id,
            nonce_hash: nonce_hash,
        };
        // Transfer `amount` microcredits from donor to program address (custody)
        let (change, pay_fut): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(cr, self.address, amount);
        return (receipt, change, finalize_donate(pay_fut, round_id, project_id, amount));
    }

    async function finalize_donate(
        pay_fut:    Future,
        round_id:   field,
        project_id: field,
        amount:     u64,
    ) {
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);
        // Settle the credits transfer atomically with state updates
        pay_fut.await();
        let tot: u64 = Mapping::get_or_use(round_totals, round_id, 0u64);
        Mapping::set(round_totals, round_id, tot + amount);
        let dc: u32 = Mapping::get_or_use(round_donor_count, round_id, 0u32);
        Mapping::set(round_donor_count, round_id, dc + 1u32);
        let pt: u64 = Mapping::get_or_use(project_donations, project_id, 0u64);
        Mapping::set(project_donations, project_id, pt + amount);
        let pd: u32 = Mapping::get_or_use(project_donor_counts, project_id, 0u32);
        Mapping::set(project_donor_counts, project_id, pd + 1u32);
        let vol: u64 = Mapping::get_or_use(global_donation_vol, 0u8, 0u64);
        Mapping::set(global_donation_vol, 0u8, vol + amount);
    }

    async transition close_round(admin: RoundAdmin) -> Future {
        return finalize_close_round(admin.round_id);
    }

    async function finalize_close_round(round_id: field) {
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);
        let updated: RoundInfo = RoundInfo {
            creator:       info.creator,
            goal:          info.goal,
            deadline:      info.deadline,
            matching_pool: info.matching_pool,
            status:        2u8,
            project_count: info.project_count,
        };
        Mapping::set(rounds, round_id, updated);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2 TRANSITIONS — ANONYMOUS COMMITTEE VOTING
    // ═══════════════════════════════════════════════════════════════════════

    async transition create_committee(
        public round_id:     field,
        public member_count: u8,
        public max_score:    u8,
    ) -> Future {
        assert(member_count > 0u8);
        assert(max_score > 0u8);
        assert(max_score <= 100u8);
        return finalize_create_committee(
            self.caller, round_id, member_count, max_score
        );
    }

    async function finalize_create_committee(
        chair:        address,
        round_id:     field,
        member_count: u8,
        max_score:    u8,
    ) {
        let config: CommitteeConfig = CommitteeConfig {
            round_id:     round_id,
            chair:        chair,
            member_count: member_count,
            max_score:    max_score,
            voting_open:  true,
        };
        Mapping::set(committees, round_id, config);
        Mapping::set(vote_counts, round_id, 0u32);
    }

    transition add_member(
        public round_id:     field,
        public member:       address,
        public member_index: u8,
    ) -> CommitteeSeat {
        return CommitteeSeat {
            owner:        member,
            round_id:     round_id,
            member_index: member_index,
            has_voted:    false,
        };
    }

    async transition submit_vote(
        seat:              CommitteeSeat,
        private score:     u8,
        public project_id: field,
        private salt:      field,
    ) -> (Ballot, CommitteeSeat, Future) {
        assert(!seat.has_voted);
        assert(score > 0u8);
        let ballot_hash: field = BHP256::hash_to_field(salt);
        let ballot: Ballot = Ballot {
            owner:       seat.owner,
            round_id:    seat.round_id,
            project_id:  project_id,
            score:       score,
            ballot_hash: ballot_hash,
        };
        let spent_seat: CommitteeSeat = CommitteeSeat {
            owner:        seat.owner,
            round_id:     seat.round_id,
            member_index: seat.member_index,
            has_voted:    true,
        };
        return (ballot, spent_seat, finalize_submit_vote(
            seat.round_id, project_id, score
        ));
    }

    async function finalize_submit_vote(
        round_id:   field,
        project_id: field,
        score:      u8,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert(config.voting_open);
        let current: ProjectScore = Mapping::get_or_use(
            project_scores,
            project_id,
            ProjectScore { project_id: project_id, total_score: 0u64, vote_count: 0u32 }
        );
        let updated: ProjectScore = ProjectScore {
            project_id:  project_id,
            total_score: current.total_score + score as u64,
            vote_count:  current.vote_count + 1u32,
        };
        Mapping::set(project_scores, project_id, updated);
        let vc: u32 = Mapping::get_or_use(vote_counts, round_id, 0u32);
        Mapping::set(vote_counts, round_id, vc + 1u32);
    }

    async transition close_voting(public round_id: field) -> Future {
        return finalize_close_voting(self.caller, round_id);
    }

    async function finalize_close_voting(caller: address, round_id: field) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert_eq(config.chair, caller);
        assert(config.voting_open);
        let closed: CommitteeConfig = CommitteeConfig {
            round_id:     config.round_id,
            chair:        config.chair,
            member_count: config.member_count,
            max_score:    config.max_score,
            voting_open:  false,
        };
        Mapping::set(committees, round_id, closed);
    }

    async transition reveal_project_score(
        public round_id:   field,
        public project_id: field,
    ) -> Future {
        return finalize_reveal_score(round_id, project_id);
    }

    async function finalize_reveal_score(round_id: field, project_id: field) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert(!config.voting_open);
        let scores: ProjectScore = Mapping::get(project_scores, project_id);
        Mapping::set(revealed_scores, project_id, scores.total_score);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 3 TRANSITIONS — MILESTONE-BASED ESCROW
    // ═══════════════════════════════════════════════════════════════════════

    // Grantor locks grant funds into program custody before the escrow activates.
    async transition lock_grant(
        private cr:              credits.aleo/credits,
        public  escrow_id:       field,
        public  round_id:        field,
        private total_amount:    u64,
        private recipient:       address,
        public  milestone_count: u8,
    ) -> (EscrowReceipt, credits.aleo/credits, Future) {
        assert(total_amount > 0u64);
        assert(milestone_count > 0u8);
        assert(milestone_count <= 10u8);
        let receipt: EscrowReceipt = EscrowReceipt {
            owner:        self.caller,
            escrow_id:    escrow_id,
            round_id:     round_id,
            total_amount: total_amount,
            recipient:    recipient,
        };
        // Lock the grant amount into program's public custody
        let (change, lock_fut): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(cr, self.address, total_amount);
        return (receipt, change, finalize_lock_grant(
            lock_fut, self.caller, escrow_id, round_id, total_amount, milestone_count
        ));
    }

    async function finalize_lock_grant(
        lock_fut:        Future,
        grantor:         address,
        escrow_id:       field,
        round_id:        field,
        total_amount:    u64,
        milestone_count: u8,
    ) {
        lock_fut.await();
        let info: EscrowInfo = EscrowInfo {
            round_id:             round_id,
            grantor:              grantor,
            total_amount:         total_amount,
            released:             0u64,
            milestone_count:      milestone_count,
            milestones_completed: 0u8,
            active:               true,
        };
        Mapping::set(escrows, escrow_id, info);
        let cnt: u32 = Mapping::get_or_use(escrow_count, 0u8, 0u32);
        Mapping::set(escrow_count, 0u8, cnt + 1u32);
        let lck: u64 = Mapping::get_or_use(total_locked, 0u8, 0u64);
        Mapping::set(total_locked, 0u8, lck + total_amount);
    }

    async transition define_milestone(
        public escrow_id:       field,
        public milestone_id:    field,
        public milestone_index: u8,
        public amount:          u64,
        public deadline:        u32,
    ) -> Future {
        return finalize_define_milestone(
            escrow_id, milestone_id, milestone_index, amount, deadline
        );
    }

    async function finalize_define_milestone(
        escrow_id:       field,
        milestone_id:    field,
        milestone_index: u8,
        amount:          u64,
        deadline:        u32,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);
        assert(milestone_index < escrow.milestone_count);
        let ms: MilestoneInfo = MilestoneInfo {
            escrow_id:       escrow_id,
            milestone_index: milestone_index,
            amount:          amount,
            deadline:        deadline,
            completed:       false,
            evidence_hash:   0field,
        };
        Mapping::set(milestones, milestone_id, ms);
    }

    async transition prove_milestone(
        private evidence_hash:    field,
        private deliverable_hash: field,
        public  escrow_id:        field,
        public  milestone_id:     field,
        public  milestone_index:  u8,
    ) -> (MilestoneProof, Future) {
        let combined:      field = evidence_hash + deliverable_hash;
        let verified_hash: field = BHP256::hash_to_field(combined);
        let proof: MilestoneProof = MilestoneProof {
            owner:           self.caller,
            escrow_id:       escrow_id,
            milestone_index: milestone_index,
            evidence_hash:   verified_hash,
            verified:        true,
        };
        return (proof, finalize_prove_milestone(
            escrow_id, milestone_id, milestone_index, verified_hash
        ));
    }

    async function finalize_prove_milestone(
        escrow_id:       field,
        milestone_id:    field,
        milestone_index: u8,
        evidence_hash:   field,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);
        let ms: MilestoneInfo = Mapping::get(milestones, milestone_id);
        assert_eq(ms.escrow_id, escrow_id);
        assert_eq(ms.milestone_index, milestone_index);
        assert(!ms.completed);
        let completed_ms: MilestoneInfo = MilestoneInfo {
            escrow_id:       ms.escrow_id,
            milestone_index: ms.milestone_index,
            amount:          ms.amount,
            deadline:        ms.deadline,
            completed:       true,
            evidence_hash:   evidence_hash,
        };
        Mapping::set(milestones, milestone_id, completed_ms);
        let updated_escrow: EscrowInfo = EscrowInfo {
            round_id:             escrow.round_id,
            grantor:              escrow.grantor,
            total_amount:         escrow.total_amount,
            released:             escrow.released,
            milestone_count:      escrow.milestone_count,
            milestones_completed: escrow.milestones_completed + 1u8,
            active:               escrow.active,
        };
        Mapping::set(escrows, escrow_id, updated_escrow);
    }

    // Disburse a completed milestone's payout from program custody to recipient.
    // `payout_amount` must match the on-chain milestone definition (verified in finalize).
    async transition release_tranche(
        receipt:                EscrowReceipt,
        public milestone_id:    field,
        public milestone_index: u8,
        public payout_amount:   u64,
    ) -> (TrancheRelease, Future) {
        let release: TrancheRelease = TrancheRelease {
            owner:           receipt.recipient,
            escrow_id:       receipt.escrow_id,
            milestone_index: milestone_index,
            amount:          payout_amount,
        };
        // Program disburses from its own public custody to the recipient
        let disburse_fut: Future =
            credits.aleo/transfer_public(receipt.recipient, payout_amount);
        return (release, finalize_release_tranche(
            disburse_fut, receipt.escrow_id, milestone_id, milestone_index, payout_amount
        ));
    }

    async function finalize_release_tranche(
        disburse_fut:    Future,
        escrow_id:       field,
        milestone_id:    field,
        milestone_index: u8,
        payout_amount:   u64,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);
        let ms: MilestoneInfo = Mapping::get(milestones, milestone_id);
        assert(ms.completed);
        assert_eq(ms.escrow_id, escrow_id);
        assert_eq(ms.milestone_index, milestone_index);
        // Verify caller isn't inflating the payout beyond what was defined
        assert_eq(ms.amount, payout_amount);
        // Settle the credits transfer — debits program's public custody balance
        disburse_fut.await();
        let new_released: u64 = escrow.released + payout_amount;
        let updated: EscrowInfo = EscrowInfo {
            round_id:             escrow.round_id,
            grantor:              escrow.grantor,
            total_amount:         escrow.total_amount,
            released:             new_released,
            milestone_count:      escrow.milestone_count,
            milestones_completed: escrow.milestones_completed,
            active:               new_released < escrow.total_amount,
        };
        Mapping::set(escrows, escrow_id, updated);
    }
}
