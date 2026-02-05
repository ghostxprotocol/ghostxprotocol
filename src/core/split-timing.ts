import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { sleep } from '../utils/helpers';
import {
  isTokenTransferInstruction,
  extractTransferAmount,
} from '../utils/helpers';
import { DEFAULT_BASE_DELAY_MS } from '../utils/constants';

/**
 * Splits a token transfer instruction into N smaller transfers of equal amounts.
 * If the instruction is not a splittable token transfer, returns it unchanged.
 *
 * @param instruction - The original transaction instruction.
 * @param splitCount - Number of splits to create.
 * @returns An array of instructions (split transfers or the original).
 */
export function splitTransaction(
  instruction: TransactionInstruction,
  splitCount: number
): TransactionInstruction[] {
  if (splitCount <= 1) {
    return [instruction];
  }

  if (!isTokenTransferInstruction(instruction)) {
    return [instruction];
  }

  const totalAmount = extractTransferAmount(instruction);
  if (totalAmount === null || totalAmount === 0n) {
    return [instruction];
  }

  const perSplit = totalAmount / BigInt(splitCount);
  const remainder = totalAmount % BigInt(splitCount);
  const splits: TransactionInstruction[] = [];

  for (let i = 0; i < splitCount; i++) {
    // Add remainder to the last split to account for integer division
    const amount = i === splitCount - 1 ? perSplit + remainder : perSplit;

    // Build the transfer data: tag byte (3) + little-endian u64 amount
    const data = Buffer.alloc(9);
    data[0] = 3; // Transfer instruction tag
    const amountBuf = Buffer.alloc(8);
    let remaining = amount;
    for (let byte = 0; byte < 8; byte++) {
      amountBuf[byte] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    amountBuf.copy(data, 1);

    splits.push(
      new TransactionInstruction({
        keys: [...instruction.keys],
        programId: instruction.programId,
        data,
      })
    );
  }

  return splits;
}

/**
 * Waits for a base duration plus a random jitter.
 * Used to introduce timing randomization between split executions
 * to make transaction patterns harder to correlate.
 *
 * @param baseMs - Minimum wait time in milliseconds.
 * @param jitterMs - Maximum additional random delay in milliseconds.
 */
export async function randomDelay(baseMs: number, jitterMs: number): Promise<void> {
  const totalDelay = baseMs + Math.floor(Math.random() * jitterMs);
  await sleep(totalDelay);
}

/**
 * Executes an array of instructions sequentially with random delays between them.
 * Each instruction is sent as its own transaction to break the on-chain correlation
 * between related operations.
 *
 * @param instructions - The instructions to execute.
 * @param connection - Solana RPC connection.
 * @param payer - The keypair paying for and signing the transactions.
 * @param options - Configuration for timing jitter.
 * @returns An array of transaction signatures, one per instruction.
 */
export async function executeWithSplitTiming(
  instructions: TransactionInstruction[],
  connection: Connection,
  payer: Keypair,
  options: { jitterMs: number }
): Promise<string[]> {
  const signatures: string[] = [];

  for (let i = 0; i < instructions.length; i++) {
    if (i > 0) {
      await randomDelay(DEFAULT_BASE_DELAY_MS, options.jitterMs);
    }

    const tx = new Transaction().add(instructions[i]);
    tx.feePayer = payer.publicKey;
    const recentBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = recentBlockhash.blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
    signatures.push(signature);
  }

  return signatures;
}
