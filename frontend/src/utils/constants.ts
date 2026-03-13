// ─── Program ID ────────────────────────────────────────────────────
export const PROGRAM_ID = 'blindround_proto.aleo' as const;

// Backwards-compat aliases (all point to same combined program)
export const PROGRAMS = {
  FUNDING_ROUND:    PROGRAM_ID,
  GRANT_COMMITTEE:  PROGRAM_ID,
  MILESTONE_ESCROW: PROGRAM_ID,
} as const;

// ─── Network ───────────────────────────────────────────────────────
export const ALEO_NETWORK = 'testnet';
export const ALEO_API_BASE = 'https://api.explorer.provable.com/v1';
