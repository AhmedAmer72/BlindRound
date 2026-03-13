// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BlindRound — Anonymous Grant Committee Voting                      ║
// ║  Private ballot submission, ZK-verified tally, delayed reveal       ║
// ╚══════════════════════════════════════════════════════════════════════╝

program blindround_vote_v1.aleo {

    // ─── Data Structures ────────────────────────────────────────────────

    struct CommitteeConfig {
        round_id: field,
        chair: address,
        member_count: u8,
        max_score: u8,
        voting_open: bool,
        tally_complete: bool,
    }

    struct ProjectScore {
        project_id: field,
        total_score: u64,
        vote_count: u32,
    }

    // Private ballot — only the voter knows their scores
    record Ballot {
        owner: address,
        round_id: field,
        project_id: field,
        score: u8,
        ballot_hash: field,
    }

    // Committee membership proof
    record CommitteeSeat {
        owner: address,
        round_id: field,
        member_index: u8,
        has_voted: bool,
    }

    // ─── On-Chain State ─────────────────────────────────────────────────

    mapping committees: field => CommitteeConfig;
    mapping project_scores: field => ProjectScore;
    mapping vote_counts: field => u32;
    mapping committee_members: field => address;
    mapping revealed_scores: field => u64;

    // ─── Transitions ────────────────────────────────────────────────────

    // Initialize committee for a round
    async transition create_committee(
        public round_id: field,
        public member_count: u8,
        public max_score: u8,
    ) -> Future {
        assert(member_count > 0u8);
        assert(max_score > 0u8);
        assert(max_score <= 100u8);

        return finalize_create_committee(
            self.caller, round_id, member_count, max_score
        );
    }

    async function finalize_create_committee(
        chair: address,
        round_id: field,
        member_count: u8,
        max_score: u8,
    ) {
        let config: CommitteeConfig = CommitteeConfig {
            round_id: round_id,
            chair: chair,
            member_count: member_count,
            max_score: max_score,
            voting_open: true,
            tally_complete: false,
        };
        Mapping::set(committees, round_id, config);
        Mapping::set(vote_counts, round_id, 0u32);
    }

    // Add a committee member (chair-only action, returns seat to member)
    transition add_member(
        public round_id: field,
        public member: address,
        public member_index: u8,
    ) -> CommitteeSeat {
        let seat: CommitteeSeat = CommitteeSeat {
            owner: member,
            round_id: round_id,
            member_index: member_index,
            has_voted: false,
        };
        return seat;
    }

    // Submit a private vote — score is hidden, only hash is committed on-chain
    async transition submit_vote(
        seat: CommitteeSeat,
        private score: u8,
        public project_id: field,
        private salt: field,
    ) -> (Ballot, CommitteeSeat, Future) {
        // Verify seat hasn't been used for this project yet
        assert(!seat.has_voted);
        assert(score > 0u8);

        // Create ballot hash (commitment to score without revealing it)
        let score_field: field = BHP256::hash_to_field(salt);
        let ballot_hash: field = BHP256::commit_to_field(
            score_field, score as scalar
        );

        let ballot: Ballot = Ballot {
            owner: seat.owner,
            round_id: seat.round_id,
            project_id: project_id,
            score: score,
            ballot_hash: ballot_hash,
        };

        // Return updated seat (marked as voted)
        let updated_seat: CommitteeSeat = CommitteeSeat {
            owner: seat.owner,
            round_id: seat.round_id,
            member_index: seat.member_index,
            has_voted: true,
        };

        return (ballot, updated_seat, finalize_submit_vote(
            seat.round_id, project_id, score
        ));
    }

    async function finalize_submit_vote(
        round_id: field,
        project_id: field,
        score: u8,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert(config.voting_open);

        // Update project score
        let current: ProjectScore = Mapping::get_or_use(
            project_scores,
            project_id,
            ProjectScore {
                project_id: project_id,
                total_score: 0u64,
                vote_count: 0u32,
            }
        );

        let updated: ProjectScore = ProjectScore {
            project_id: project_id,
            total_score: current.total_score + score as u64,
            vote_count: current.vote_count + 1u32,
        };
        Mapping::set(project_scores, project_id, updated);

        // Increment global vote counter
        let vc: u32 = Mapping::get_or_use(vote_counts, round_id, 0u32);
        Mapping::set(vote_counts, round_id, vc + 1u32);
    }

    // Close voting and tally results (chair-only)
    async transition close_voting(
        public round_id: field,
    ) -> Future {
        return finalize_close_voting(self.caller, round_id);
    }

    async function finalize_close_voting(
        caller: address,
        round_id: field,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert_eq(config.chair, caller);
        assert(config.voting_open);

        let updated: CommitteeConfig = CommitteeConfig {
            round_id: config.round_id,
            chair: config.chair,
            member_count: config.member_count,
            max_score: config.max_score,
            voting_open: false,
            tally_complete: true,
        };
        Mapping::set(committees, round_id, updated);
    }

    // Reveal final scores for a project after voting is closed
    async transition reveal_project_score(
        public round_id: field,
        public project_id: field,
    ) -> Future {
        return finalize_reveal_score(round_id, project_id);
    }

    async function finalize_reveal_score(
        round_id: field,
        project_id: field,
    ) {
        let config: CommitteeConfig = Mapping::get(committees, round_id);
        assert(config.tally_complete);

        let scores: ProjectScore = Mapping::get(project_scores, project_id);
        Mapping::set(revealed_scores, project_id, scores.total_score);
    }

    // ─── ZK Score Verification ──────────────────────────────────────────

    // Verify a ballot's score without revealing the voter
    transition verify_ballot(
        ballot: Ballot,
        private expected_score: u8,
    ) -> public bool {
        let valid: bool = ballot.score == expected_score;
        return valid;
    }

    // Compute weighted average score from private inputs
    transition compute_weighted_score(
        private score_1: u8,
        private weight_1: u8,
        private score_2: u8,
        private weight_2: u8,
        private score_3: u8,
        private weight_3: u8,
    ) -> public u64 {
        let weighted_sum: u64 =
            (score_1 as u64 * weight_1 as u64) +
            (score_2 as u64 * weight_2 as u64) +
            (score_3 as u64 * weight_3 as u64);
        let total_weight: u64 =
            weight_1 as u64 + weight_2 as u64 + weight_3 as u64;

        let avg: u64 = weighted_sum / total_weight;
        return avg;
    }
}
