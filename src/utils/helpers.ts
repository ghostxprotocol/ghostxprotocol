import { TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Pauses execution for the specified duration.
 * @param ms - Milliseconds to sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether the given instruction is an SPL Token transfer.
 * The SPL Token "Transfer" instruction has a single-byte tag of 3
 * and a data length of 9 bytes (1 tag + 8 amount).
 */
export function isTokenTransferInstruction(ix: TransactionInstruction): boolean {
  if (!ix.programId.equals(TOKEN_PROGRAM_ID)) {
    return false;
  }

  if (ix.data.length !== 9) {
    return false;
  }

  return ix.data[0] === 3;
}

/**
 * Extracts the transfer amount from an SPL Token transfer instruction.
 * Returns null if the instruction is not a valid token transfer.
 */
export function extractTransferAmount(ix: TransactionInstruction): bigint | null {
  if (!isTokenTransferInstruction(ix)) {
    return null;
  }

  // Amount is stored as a little-endian u64 at bytes 1..9
  const amountBuffer = ix.data.subarray(1, 9);
  const low = BigInt(
    amountBuffer[0] |
      (amountBuffer[1] << 8) |
      (amountBuffer[2] << 16) |
      (amountBuffer[3] << 24)
  ) & 0xffffffffn;
  const high = BigInt(
    amountBuffer[4] |
      (amountBuffer[5] << 8) |
      (amountBuffer[6] << 16) |
      (amountBuffer[7] << 24)
  ) & 0xffffffffn;

  return (high << 32n) | low;
}
