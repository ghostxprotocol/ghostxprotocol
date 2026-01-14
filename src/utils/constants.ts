/** RPC endpoints for each Solana network. */
export const RPC_ENDPOINTS: Record<string, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

/** Default Jito block engine endpoint for MEV-protected submission. */
export const DEFAULT_JITO_ENDPOINT =
  'https://mainnet.block-engine.jito.wtf/api/v1/bundles';

/** Default number of splits for transaction splitting. */
export const DEFAULT_SPLIT_COUNT = 3;

/** Default timing jitter ceiling in milliseconds. */
export const DEFAULT_JITTER_MS = 2000;

/** Default base delay between split executions in milliseconds. */
export const DEFAULT_BASE_DELAY_MS = 500;

/** Default priority fee in lamports. */
export const DEFAULT_PRIORITY_FEE = 5000;

/** Minimum lamports to fund an ephemeral keypair (rent-exempt minimum + headroom). */
export const EPHEMERAL_FUNDING_LAMPORTS = 10_000_000;

/** SPL Memo program ID. */
export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
