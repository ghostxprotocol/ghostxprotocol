import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import type { GhostConfig, ExecuteOptions, ExecuteResult } from '../types';
import { generateEphemeralKeypair, maskTransaction, createFundingInstruction } from '../crypto/masking';
import { sendWithJito } from './mev-protection';
import { splitTransaction, executeWithSplitTiming } from './split-timing';
import { AgentChannel } from './agent-channel';
import {
  RPC_ENDPOINTS,
  DEFAULT_JITO_ENDPOINT,
  DEFAULT_SPLIT_COUNT,
  DEFAULT_JITTER_MS,
  EPHEMERAL_FUNDING_LAMPORTS,
} from '../utils/constants';

/**
 * Primary entry point for the Ghost Protocol SDK.
 * Provides wallet identity masking, MEV-protected execution,
 * transaction splitting with timing randomization, and
 * encrypted agent-to-agent communication.
 */
export class GhostClient {
  private readonly connection: Connection;
  private readonly wallet: Keypair;
  private readonly jitoEndpoint: string;

  constructor(config: GhostConfig) {
    const rpcUrl = config.rpcEndpoint ?? RPC_ENDPOINTS[config.network];
    this.connection = new Connection(rpcUrl, config.commitment ?? 'confirmed');
    this.wallet = config.wallet;
    this.jitoEndpoint = config.jitoEndpoint ?? DEFAULT_JITO_ENDPOINT;
  }

  /**
   * Executes one or more instructions through the Ghost private execution layer.
   *
   * Depending on the provided options, the transaction may be:
   * - Masked via an ephemeral keypair (mask: true)
   * - Split into multiple smaller transactions with random timing (splitTiming: true)
   * - Routed through Jito bundles for MEV protection (antiMev: true)
   *
   * @param instruction - A single instruction or array of instructions to execute.
   * @param options - Execution options controlling privacy features.
   * @returns The execution result including signature(s) and metadata.
   */
  async execute(
    instruction: TransactionInstruction | TransactionInstruction[],
    options: ExecuteOptions = {}
  ): Promise<ExecuteResult> {
    const instructions = Array.isArray(instruction) ? instruction : [instruction];
    const submittedAt = Date.now();

    // Split timing: break instructions into smaller pieces and stagger execution
    if (options.splitTiming) {
      const splitCount = options.splitCount ?? DEFAULT_SPLIT_COUNT;
      const jitterMs = options.timingJitterMs ?? DEFAULT_JITTER_MS;

      const allSplits: TransactionInstruction[] = [];
      for (const ix of instructions) {
        allSplits.push(...splitTransaction(ix, splitCount));
      }

      let payer = this.wallet;
      let maskedFrom: string | undefined;

      if (options.mask) {
        payer = generateEphemeralKeypair();
        maskedFrom = payer.publicKey.toBase58();
        await this.fundEphemeral(payer);
      }

      const signatures = await executeWithSplitTiming(
        allSplits,
        this.connection,
        payer,
        { jitterMs }
      );

      return {
        signature: signatures[0],
        maskedFrom,
        splits: signatures,
        timing: { submitted: submittedAt, confirmed: Date.now() },
      };
    }

    // Build the transaction
    let tx = new Transaction();
    for (const ix of instructions) {
      tx.add(ix);
    }

    let maskedFrom: string | undefined;
    let signers: Keypair[] = [this.wallet];

    // Masking: use ephemeral keypair as the apparent sender
    if (options.mask) {
      const ephemeral = generateEphemeralKeypair();
      maskedFrom = ephemeral.publicKey.toBase58();
      tx = maskTransaction(tx, ephemeral, this.wallet, EPHEMERAL_FUNDING_LAMPORTS);
      signers = [this.wallet, ephemeral];
    }

    tx.feePayer = signers[signers.length - 1].publicKey;
    const recentBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = recentBlockhash.blockhash;

    // MEV protection: route through Jito bundle
    if (options.antiMev) {
      tx.sign(...signers);
      const serialized = tx.serialize();
      const bundleId = await sendWithJito(
        Buffer.from(serialized),
        this.jitoEndpoint
      );

      return {
        signature: bundleId,
        maskedFrom,
        timing: { submitted: submittedAt, confirmed: Date.now() },
      };
    }

    // Standard execution path
    const signature = await sendAndConfirmTransaction(this.connection, tx, signers);

    return {
      signature,
      maskedFrom,
      timing: { submitted: submittedAt, confirmed: Date.now() },
    };
  }

  /**
   * Creates an AgentChannel for encrypted peer-to-peer messaging.
   */
  createChannel(): AgentChannel {
    return new AgentChannel(this.connection, this.wallet);
  }

  /**
   * Returns the SOL balance of the configured wallet in SOL (not lamports).
   */
  async getBalance(): Promise<number> {
    const lamports = await this.connection.getBalance(this.wallet.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /** Funds an ephemeral keypair from the main wallet. */
  private async fundEphemeral(ephemeral: Keypair): Promise<string> {
    const ix = createFundingInstruction(
      this.wallet.publicKey,
      ephemeral.publicKey,
      EPHEMERAL_FUNDING_LAMPORTS
    );
    const tx = new Transaction().add(ix);
    tx.feePayer = this.wallet.publicKey;
    const recentBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = recentBlockhash.blockhash;

    return sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
  }
}
