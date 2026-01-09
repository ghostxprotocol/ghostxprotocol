import { Keypair, Commitment } from '@solana/web3.js';

/** Core configuration for the Ghost client. */
export interface GhostConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  wallet: Keypair;
  rpcEndpoint?: string;
  jitoEndpoint?: string;
  commitment?: Commitment;
}

/** Options controlling how a transaction is executed. */
export interface ExecuteOptions {
  /** Mask the sender identity via an ephemeral keypair. */
  mask?: boolean;
  /** Route through Jito bundles for MEV protection. */
  antiMev?: boolean;
  /** Split the transaction and stagger execution timing. */
  splitTiming?: boolean;
  /** Number of splits when splitTiming is enabled. Defaults to 3. */
  splitCount?: number;
  /** Maximum random jitter in milliseconds between split executions. */
  timingJitterMs?: number;
  /** Priority fee in lamports to attach to the transaction. */
  priorityFee?: number;
}

/** Result returned after executing a transaction through Ghost. */
export interface ExecuteResult {
  /** The primary transaction signature. */
  signature: string;
  /** The ephemeral public key used if masking was enabled. */
  maskedFrom?: string;
  /** Signatures of split transactions if splitting was enabled. */
  splits?: string[];
  /** Timing metadata for the execution. */
  timing?: {
    submitted: number;
    confirmed: number;
  };
}

/** An encrypted message exchanged between agents. */
export interface GhostMessage {
  from: string;
  to: string;
  payload: Uint8Array;
  nonce: Uint8Array;
  timestamp: number;
}

/** Metadata for an agent-to-agent communication channel. */
export interface AgentChannel {
  channelId: string;
  participants: string[];
  createdAt: number;
}
