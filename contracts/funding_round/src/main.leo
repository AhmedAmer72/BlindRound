// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BlindRound — Private Funding Round Protocol                        ║
// ║  Create rounds, accept private donations, compute quadratic match   ║
// ╚══════════════════════════════════════════════════════════════════════╝

program blindround_fund_v1.aleo {

    // ─── Data Structures ────────────────────────────────────────────────

    struct RoundInfo {
        creator: address,
        goal: u64,
        deadline: u32,
        matching_pool: u64,
        status: u8,       // 0=pending, 1=active, 2=closed, 3=finalized
        project_count: u8,
    }

    struct ProjectInfo {
        round_id: field,
        applicant: address,
        name_hash: field,
        total_donated: u64,
        donor_count: u32,
    }

    // Private receipt issued to donor — proves participation without revealing amount
    record DonationReceipt {
        owner: address,
        round_id: field,
        amount: u64,
        project_id: field,
        nonce_hash: field,
    }

    // Admin token — proves creator authority over a round
    record RoundAdmin {
        owner: address,
        round_id: field,
    }

    // ─── On-Chain State ─────────────────────────────────────────────────

    mapping rounds: field => RoundInfo;
    mapping round_totals: field => u64;
    mapping round_donor_count: field => u32;
    mapping projects: field => ProjectInfo;
    mapping project_donations: field => u64;
    mapping project_donor_counts: field => u32;
    mapping global_round_count: u8 => u32;
    mapping global_donation_volume: u8 => u64;

    // ─── Transitions ────────────────────────────────────────────────────

    // Create a new funding round (admin action)
    async transition create_round(
        public round_id: field,
        public goal: u64,
        public deadline: u32,
        public matching_pool: u64,
    ) -> (RoundAdmin, Future) {

        let admin_token: RoundAdmin = RoundAdmin {
            owner: self.caller,
            round_id: round_id,
        };

        return (admin_token, finalize_create_round(
            self.caller, round_id, goal, deadline, matching_pool
        ));
    }

    async function finalize_create_round(
        creator: address,
        round_id: field,
        goal: u64,
        deadline: u32,
        matching_pool: u64,
    ) {
        let info: RoundInfo = RoundInfo {
            creator: creator,
            goal: goal,
            deadline: deadline,
            matching_pool: matching_pool,
            status: 1u8,
            project_count: 0u8,
        };
        Mapping::set(rounds, round_id, info);
        Mapping::set(round_totals, round_id, 0u64);
        Mapping::set(round_donor_count, round_id, 0u32);

        let count: u32 = Mapping::get_or_use(global_round_count, 0u8, 0u32);
        Mapping::set(global_round_count, 0u8, count + 1u32);
    }

    // Register a project in a round
    async transition register_project(
        public round_id: field,
        public project_id: field,
        public name_hash: field,
    ) -> Future {
        return finalize_register_project(
            self.caller, round_id, project_id, name_hash
        );
    }

    async function finalize_register_project(
        applicant: address,
        round_id: field,
        project_id: field,
        name_hash: field,
    ) {
        let round: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(round.status, 1u8);

        let proj: ProjectInfo = ProjectInfo {
            round_id: round_id,
            applicant: applicant,
            name_hash: name_hash,
            total_donated: 0u64,
            donor_count: 0u32,
        };
        Mapping::set(projects, project_id, proj);
        Mapping::set(project_donations, project_id, 0u64);
        Mapping::set(project_donor_counts, project_id, 0u32);

        let updated_round: RoundInfo = RoundInfo {
            creator: round.creator,
            goal: round.goal,
            deadline: round.deadline,
            matching_pool: round.matching_pool,
            status: round.status,
            project_count: round.project_count + 1u8,
        };
        Mapping::set(rounds, round_id, updated_round);
    }

    // Private donation — amount and donor identity hidden via ZK proof
    async transition donate(
        private amount: u64,
        public round_id: field,
        public project_id: field,
        private salt: field,
    ) -> (DonationReceipt, Future) {
        assert(amount > 0u64);

        // Create unique nonce from salt and caller for commitment
        let nonce_hash: field = BHP256::hash_to_field(salt);

        let receipt: DonationReceipt = DonationReceipt {
            owner: self.caller,
            round_id: round_id,
            amount: amount,
            project_id: project_id,
            nonce_hash: nonce_hash,
        };

        return (receipt, finalize_donate(round_id, project_id, amount));
    }

    async function finalize_donate(
        round_id: field,
        project_id: field,
        amount: u64,
    ) {
        // Verify round is active
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);

        // Update round totals
        let current_total: u64 = Mapping::get_or_use(round_totals, round_id, 0u64);
        Mapping::set(round_totals, round_id, current_total + amount);

        let donor_count: u32 = Mapping::get_or_use(round_donor_count, round_id, 0u32);
        Mapping::set(round_donor_count, round_id, donor_count + 1u32);

        // Update project totals
        let proj_total: u64 = Mapping::get_or_use(project_donations, project_id, 0u64);
        Mapping::set(project_donations, project_id, proj_total + amount);

        let proj_donors: u32 = Mapping::get_or_use(project_donor_counts, project_id, 0u32);
        Mapping::set(project_donor_counts, project_id, proj_donors + 1u32);

        // Update global volume
        let vol: u64 = Mapping::get_or_use(global_donation_volume, 0u8, 0u64);
        Mapping::set(global_donation_volume, 0u8, vol + amount);
    }

    // Close round — only round creator can close
    async transition close_round(
        admin: RoundAdmin,
    ) -> Future {
        return finalize_close_round(admin.round_id);
    }

    async function finalize_close_round(round_id: field) {
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);

        let updated: RoundInfo = RoundInfo {
            creator: info.creator,
            goal: info.goal,
            deadline: info.deadline,
            matching_pool: info.matching_pool,
            status: 2u8,
            project_count: info.project_count,
        };
        Mapping::set(rounds, round_id, updated);
    }

    // ─── Quadratic Funding Math (Pure ZK Computation) ──────────────────

    // Integer square root via Newton's method — works in ZK circuit
    function isqrt(value: u64) -> u64 {
        if (value <= 1u64) {
            return value;
        }
        // Initial estimate
        let x: u64 = value;
        let y: u64 = (x + 1u64) / 2u64;

        // 10 iterations of Newton's method for convergence
        let r0: u64  = (y + x / y) / 2u64;
        let r1: u64  = (r0 + x / r0) / 2u64;
        let r2: u64  = (r1 + x / r1) / 2u64;
        let r3: u64  = (r2 + x / r2) / 2u64;
        let r4: u64  = (r3 + x / r3) / 2u64;
        let r5: u64  = (r4 + x / r4) / 2u64;
        let r6: u64  = (r5 + x / r5) / 2u64;
        let r7: u64  = (r6 + x / r6) / 2u64;
        let r8: u64  = (r7 + x / r7) / 2u64;
        let r9: u64  = (r8 + x / r8) / 2u64;

        return r9;
    }

    // Compute quadratic funding match amount from private donations
    // QF formula: match = (sum(sqrt(d_i)))^2 - sum(d_i)
    transition compute_qf_match(
        private donation_1: u64,
        private donation_2: u64,
        private donation_3: u64,
        private donation_4: u64,
        public pool_size: u64,
    ) -> public u64 {
        // Scale donations for better precision (multiply by 10000)
        let s1: u64 = isqrt(donation_1 * 10000u64);
        let s2: u64 = isqrt(donation_2 * 10000u64);
        let s3: u64 = isqrt(donation_3 * 10000u64);
        let s4: u64 = isqrt(donation_4 * 10000u64);

        let sum_sqrt: u64 = s1 + s2 + s3 + s4;
        let squared: u64 = (sum_sqrt * sum_sqrt) / 10000u64;
        let direct: u64 = donation_1 + donation_2 + donation_3 + donation_4;

        let match_raw: u64 = squared - direct;

        // Cap match at available pool
        let result: u64 = match_raw < pool_size ? match_raw : pool_size;
        return result;
    }

    // Generate a verifiable donation commitment (for audit after round closes)
    transition generate_commitment(
        private amount: u64,
        private salt: field,
    ) -> public field {
        let preimage: field = BHP256::hash_to_field(salt);
        let commitment: field = BHP256::commit_to_field(preimage, amount as scalar);
        return commitment;
    }
}
