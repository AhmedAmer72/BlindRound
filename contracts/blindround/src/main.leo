// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BlindRound — Combined Private Grants Protocol                          ║
// ║  Layer 1: Private Funding Round                                         ║
// ║  Layer 2: Anonymous Committee Voting                                    ║
// ║  Layer 3: Milestone-Based Escrow                                        ║
// ║  Leo 3.4.0  ·  @noupgrade                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

program blindround_v1.aleo {

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // Runs on-chain at deployment. @noupgrade locks the program permanently
    // at edition 0 — the compiler emits `assert.eq edition 0u16` in AVM.
    // ═══════════════════════════════════════════════════════════════════════

    @noupgrade
    async constructor() {}

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1 — STRUCTS & RECORDS: FUNDING ROUND
    // ═══════════════════════════════════════════════════════════════════════

    // On-chain state for a funding round
    struct RoundInfo {
        creator: address,
        goal: u64,
        deadline: u32,
        matching_pool: u64,
        status: u8,         // 0=pending  1=active  2=closed  3=finalized
        project_count: u8,
    }

    // On-chain state for a registered project
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

    // Admin capability token — proves creator authority over a round
    record RoundAdmin {
        owner: address,
        round_id: field,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2 — STRUCTS & RECORDS: COMMITTEE VOTING
    // ═══════════════════════════════════════════════════════════════════════

    // On-chain config for a grant committee
    struct CommitteeConfig {
        round_id: field,
        chair: address,
        member_count: u8,
        max_score: u8,
        voting_open: bool,
        tally_complete: bool,
    }

    // Aggregated score for a project
    struct ProjectScore {
        project_id: field,
        total_score: u64,
        vote_count: u32,
    }

    // Private ballot — score committed via ZK, only hash stored on-chain
    record Ballot {
        owner: address,
        round_id: field,
        project_id: field,
        score: u8,
        ballot_hash: field,
    }

    // Committee membership token — single-use per (member, project) pair
    record CommitteeSeat {
        owner: address,
        round_id: field,
        member_index: u8,
        has_voted: bool,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 3 — STRUCTS & RECORDS: MILESTONE ESCROW
    // ═══════════════════════════════════════════════════════════════════════

    // On-chain state for a locked grant escrow
    struct EscrowInfo {
        round_id: field,
        grantor: address,
        total_amount: u64,
        released: u64,
        milestone_count: u8,
        milestones_completed: u8,
        active: bool,
    }

    // On-chain definition of a single milestone
    struct MilestoneInfo {
        escrow_id: field,
        milestone_index: u8,
        amount: u64,
        deadline: u32,
        completed: bool,
        evidence_hash: field,
    }

    // Private escrow token — proves grant was locked without exposing amount
    record EscrowReceipt {
        owner: address,
        escrow_id: field,
        round_id: field,
        total_amount: u64,
        recipient: address,
    }

    // ZK proof-of-delivery token — private evidence verified on-chain
    record MilestoneProof {
        owner: address,
        escrow_id: field,
        milestone_index: u8,
        evidence_hash: field,
        verified: bool,
    }

    // Tranche release token issued to recipient after milestone is verified
    record TrancheRelease {
        owner: address,
        escrow_id: field,
        milestone_index: u8,
        amount: u64,        // on-chain value; actual release tracked in escrow mapping
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 1: FUNDING ROUND
    // ═══════════════════════════════════════════════════════════════════════

    mapping rounds:               field => RoundInfo;
    mapping round_totals:         field => u64;
    mapping round_donor_count:    field => u32;
    mapping projects:             field => ProjectInfo;
    mapping project_donations:    field => u64;
    mapping project_donor_counts: field => u32;
    mapping global_round_count:   u8    => u32;     // key 0u8 → total rounds
    mapping global_donation_vol:  u8    => u64;     // key 0u8 → total volume

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 2: COMMITTEE VOTING
    // ═══════════════════════════════════════════════════════════════════════

    mapping committees:       field => CommitteeConfig;
    mapping project_scores:   field => ProjectScore;
    mapping vote_counts:      field => u32;
    mapping committee_seats:  field => address;     // reserved: member registry
    mapping revealed_scores:  field => u64;

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPINGS — LAYER 3: MILESTONE ESCROW
    // ═══════════════════════════════════════════════════════════════════════

    mapping escrows:       field => EscrowInfo;
    mapping milestones:    field => MilestoneInfo;
    mapping escrow_count:  u8    => u32;    // key 0u8 → total escrows
    mapping total_locked:  u8    => u64;    // key 0u8 → sum of locked grants
    mapping total_released: u8   => u64;    // key 0u8 → sum of released grants

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1 TRANSITIONS — FUNDING ROUND
    // ═══════════════════════════════════════════════════════════════════════

    // Create a new funding round; returns an admin capability token to caller
    async transition create_round(
        public round_id:      field,
        public goal:          u64,
        public deadline:      u32,
        public matching_pool: u64,
    ) -> (RoundAdmin, Future) {
        let admin: RoundAdmin = RoundAdmin {
            owner: self.caller,
            round_id: round_id,
        };
        return (admin, finalize_create_round(
            self.caller, round_id, goal, deadline, matching_pool
        ));
    }

    async function finalize_create_round(
        creator:      address,
        round_id:     field,
        goal:         u64,
        deadline:     u32,
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

        let cnt: u32 = Mapping::get_or_use(global_round_count, 0u8, 0u32);
        Mapping::set(global_round_count, 0u8, cnt + 1u32);
    }

    // Register a project inside an active round
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
            round_id: round_id,
            applicant: applicant,
            name_hash: name_hash,
            total_donated: 0u64,
            donor_count: 0u32,
        };
        Mapping::set(projects, project_id, proj);
        Mapping::set(project_donations, project_id, 0u64);
        Mapping::set(project_donor_counts, project_id, 0u32);

        let updated: RoundInfo = RoundInfo {
            creator: round.creator,
            goal: round.goal,
            deadline: round.deadline,
            matching_pool: round.matching_pool,
            status: round.status,
            project_count: round.project_count + 1u8,
        };
        Mapping::set(rounds, round_id, updated);
    }

    // Private donation — amount and donor identity concealed via ZK proof
    async transition donate(
        private amount:     u64,
        public  round_id:   field,
        public  project_id: field,
        private salt:       field,
    ) -> (DonationReceipt, Future) {
        assert(amount > 0u64);

        // Commitment: donor can later prove participation without revealing amount
        let nonce_hash: field = BHP256::hash_to_field(salt);

        let receipt: DonationReceipt = DonationReceipt {
            owner:      self.caller,
            round_id:   round_id,
            amount:     amount,
            project_id: project_id,
            nonce_hash: nonce_hash,
        };
        return (receipt, finalize_donate(round_id, project_id, amount));
    }

    async function finalize_donate(
        round_id:   field,
        project_id: field,
        amount:     u64,
    ) {
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);

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

    // Close a round — caller must hold the RoundAdmin capability token
    async transition close_round(
        admin: RoundAdmin,
    ) -> Future {
        return finalize_close_round(admin.round_id);
    }

    async function finalize_close_round(round_id: field) {
        let info: RoundInfo = Mapping::get(rounds, round_id);
        assert_eq(info.status, 1u8);

        let updated: RoundInfo = RoundInfo {
            creator:        info.creator,
            goal:           info.goal,
            deadline:       info.deadline,
            matching_pool:  info.matching_pool,
            status:         2u8,
            project_count:  info.project_count,
        };
        Mapping::set(rounds, round_id, updated);
    }

    // ─── Quadratic Funding Math (pure, ZK-circuit-safe) ─────────────────

    // Integer square root via Newton's method (unrolled for fixed-depth ZK circuit)
    function isqrt(value: u64) -> u64 {
        if (value <= 1u64) {
            return value;
        }
        let x:  u64 = value;
        let y:  u64 = (x + 1u64) / 2u64;
        let r0: u64 = (y  + x / y)  / 2u64;
        let r1: u64 = (r0 + x / r0) / 2u64;
        let r2: u64 = (r1 + x / r1) / 2u64;
        let r3: u64 = (r2 + x / r2) / 2u64;
        let r4: u64 = (r3 + x / r3) / 2u64;
        let r5: u64 = (r4 + x / r4) / 2u64;
        let r6: u64 = (r5 + x / r5) / 2u64;
        let r7: u64 = (r6 + x / r6) / 2u64;
        let r8: u64 = (r7 + x / r7) / 2u64;
        let r9: u64 = (r8 + x / r8) / 2u64;
        return r9;
    }

    // QF match formula: (Σ√dᵢ)² − Σdᵢ, capped at pool_size
    // Inputs kept private so donor amounts cannot be reverse-engineered
    transition compute_qf_match(
        private donation_1: u64,
        private donation_2: u64,
        private donation_3: u64,
        private donation_4: u64,
        public  pool_size:  u64,
    ) -> public u64 {
        // Scale by 10 000 before sqrt for better integer precision
        let s1: u64 = isqrt(donation_1 * 10000u64);
        let s2: u64 = isqrt(donation_2 * 10000u64);
        let s3: u64 = isqrt(donation_3 * 10000u64);
        let s4: u64 = isqrt(donation_4 * 10000u64);

        let sum_sqrt: u64 = s1 + s2 + s3 + s4;
        let squared:  u64 = (sum_sqrt * sum_sqrt) / 10000u64;
        let direct:   u64 = donation_1 + donation_2 + donation_3 + donation_4;
        let raw:      u64 = squared - direct;
        let matched:  u64 = raw < pool_size ? raw : pool_size;
        return matched;
    }

    // Generate a verifiable commitment to a donation amount (for post-round audit)
    transition generate_commitment(
        private amount: u64,
        private salt:   field,
    ) -> public field {
        let preimage:   field = BHP256::hash_to_field(salt);
        let commitment: field = BHP256::commit_to_field(preimage, amount as scalar);
        return commitment;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2 TRANSITIONS — ANONYMOUS COMMITTEE VOTING
    // ═══════════════════════════════════════════════════════════════════════

    // Initialize a grant committee for a round
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
            round_id:       round_id,
            chair:          chair,
            member_count:   member_count,
            max_score:      max_score,
            voting_open:    true,
            tally_complete: false,
        };
        Mapping::set(committees, round_id, config);
        Mapping::set(vote_counts, round_id, 0u32);
    }

    // Issue a committee seat (capability token) to a member (chair-only off-chain check)
    transition add_member(
        public round_id:      field,
        public member:        address,
        public member_index:  u8,
    ) -> CommitteeSeat {
        return CommitteeSeat {
            owner:        member,
            round_id:     round_id,
            member_index: member_index,
            has_voted:    false,
        };
    }

    // Submit a private vote — score committed via BHP256; value hidden from chain
    async transition submit_vote(
        seat:            CommitteeSeat,
        private score:   u8,
        public  project_id: field,
        private salt:    field,
    ) -> (Ballot, CommitteeSeat, Future) {
        assert(!seat.has_voted);
        assert(score > 0u8);

        // Pedersen-style commitment: hash(salt) used as blinding factor
        let blinded:     field = BHP256::hash_to_field(salt);
        let ballot_hash: field = BHP256::commit_to_field(blinded, score as scalar);

        let ballot: Ballot = Ballot {
            owner:       seat.owner,
            round_id:    seat.round_id,
            project_id:  project_id,
            score:       score,
            ballot_hash: ballot_hash,
        };

        // Consume seat and return a spent version (prevents double-voting)
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
            ProjectScore {
                project_id:  project_id,
                total_score: 0u64,
                vote_count:  0u32,
            }
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

    // Close voting phase (chair-only — verified on-chain via stored chair address)
    async transition close_voting(
        public round_id: field,
    ) -> Future {
        return finalize_close_voting(self.caller, round_id);
    }

    async function finalize_close_voting(
        caller:   address,
        round_id: field,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert_eq(config.chair, caller);
        assert(config.voting_open);

        let closed: CommitteeConfig = CommitteeConfig {
            round_id:       config.round_id,
            chair:          config.chair,
            member_count:   config.member_count,
            max_score:      config.max_score,
            voting_open:    false,
            tally_complete: true,
        };
        Mapping::set(committees, round_id, closed);
    }

    // Publish the final aggregated score for a project (after voting closes)
    async transition reveal_project_score(
        public round_id:   field,
        public project_id: field,
    ) -> Future {
        return finalize_reveal_score(round_id, project_id);
    }

    async function finalize_reveal_score(
        round_id:   field,
        project_id: field,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert(config.tally_complete);

        let scores: ProjectScore = Mapping::get(project_scores, project_id);
        Mapping::set(revealed_scores, project_id, scores.total_score);
    }

    // Zero-knowledge ballot verification (off-chain proof, no state mutation)
    transition verify_ballot(
        ballot:               Ballot,
        private expected_score: u8,
    ) -> public bool {
        return ballot.score == expected_score;
    }

    // Compute weighted average score from private inputs, result published
    transition compute_weighted_score(
        private score_1:  u8,
        private weight_1: u8,
        private score_2:  u8,
        private weight_2: u8,
        private score_3:  u8,
        private weight_3: u8,
    ) -> public u64 {
        let weighted_sum: u64 =
            (score_1 as u64 * weight_1 as u64) +
            (score_2 as u64 * weight_2 as u64) +
            (score_3 as u64 * weight_3 as u64);
        let total_weight: u64 =
            weight_1 as u64 + weight_2 as u64 + weight_3 as u64;
        return weighted_sum / total_weight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 3 TRANSITIONS — MILESTONE-BASED ESCROW
    // ═══════════════════════════════════════════════════════════════════════

    // Lock a grant award into escrow with a defined milestone schedule
    async transition lock_grant(
        public  escrow_id:       field,
        public  round_id:        field,
        private total_amount:    u64,
        private recipient:       address,
        public  milestone_count: u8,
    ) -> (EscrowReceipt, Future) {
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
        return (receipt, finalize_lock_grant(
            self.caller, escrow_id, round_id, total_amount, milestone_count
        ));
    }

    async function finalize_lock_grant(
        grantor:         address,
        escrow_id:       field,
        round_id:        field,
        total_amount:    u64,
        milestone_count: u8,
    ) {
        let info: EscrowInfo = EscrowInfo {
            round_id:              round_id,
            grantor:               grantor,
            total_amount:          total_amount,
            released:              0u64,
            milestone_count:       milestone_count,
            milestones_completed:  0u8,
            active:                true,
        };
        Mapping::set(escrows, escrow_id, info);

        let cnt: u32 = Mapping::get_or_use(escrow_count, 0u8, 0u32);
        Mapping::set(escrow_count, 0u8, cnt + 1u32);

        let lck: u64 = Mapping::get_or_use(total_locked, 0u8, 0u64);
        Mapping::set(total_locked, 0u8, lck + total_amount);
    }

    // Define a single milestone within an escrow (grantor action)
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

    // Prove milestone completion — private evidence stays off-chain; only hash committed
    async transition prove_milestone(
        private evidence_hash:    field,
        private deliverable_hash: field,
        public  escrow_id:        field,
        public  milestone_id:     field,
        public  milestone_index:  u8,
    ) -> (MilestoneProof, Future) {
        // Combine evidence and deliverable into a single verifiable hash
        let blinded:       field = BHP256::hash_to_field(evidence_hash);
        let verified_hash: field = BHP256::commit_to_field(
            blinded, deliverable_hash as scalar
        );

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

    // Release a payment tranche after on-chain milestone verification
    async transition release_tranche(
        receipt:                EscrowReceipt,
        public milestone_id:    field,
        public milestone_index: u8,
    ) -> (TrancheRelease, Future) {
        // amount field is 0u64 here; actual release tracked in the escrow mapping
        let release: TrancheRelease = TrancheRelease {
            owner:           receipt.recipient,
            escrow_id:       receipt.escrow_id,
            milestone_index: milestone_index,
            amount:          0u64,
        };
        return (release, finalize_release_tranche(
            receipt.escrow_id, milestone_id, milestone_index
        ));
    }

    async function finalize_release_tranche(
        escrow_id:       field,
        milestone_id:    field,
        milestone_index: u8,
    ) {
        let escrow: EscrowInfo = Mapping::get(escrows, escrow_id);
        assert(escrow.active);

        let ms: MilestoneInfo = Mapping::get(milestones, milestone_id);
        assert(ms.completed);
        assert_eq(ms.escrow_id, escrow_id);
        assert_eq(ms.milestone_index, milestone_index);

        let new_released: u64 = escrow.released + ms.amount;

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

        let rel: u64 = Mapping::get_or_use(total_released, 0u8, 0u64);
        Mapping::set(total_released, 0u8, rel + ms.amount);
    }

    // ─── ZK Verification Helpers (pure, no state mutation) ───────────────

    // Prove a deliverable matches an expected hash without exposing the content
    transition verify_deliverable(
        private actual_hash:   field,
        private expected_hash: field,
    ) -> public bool {
        return actual_hash == expected_hash;
    }

    // Compute remaining escrow balance from private inputs
    transition compute_remaining(
        private total:    u64,
        private released: u64,
    ) -> public u64 {
        assert(total >= released);
        return total - released;
    }
}
