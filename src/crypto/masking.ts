import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';

/**
 * Generates a fresh ephemeral keypair for one-time use.
 * The keypair should be discarded after the transaction is confirmed
 * to prevent any link between the agent wallet and the on-chain activity.
 */
export function generateEphemeralKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Creates a SystemProgram.transfer instruction that moves lamports
 * from one account to another.
 * @param from - Source public key.
 * @param to - Destination public key.
 * @param lamports - Amount of lamports to transfer.
 */
export function createFundingInstruction(
  from: PublicKey,
  to: PublicKey,
  lamports: number
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports,
  });
}

/**
 * Re-signs a transaction using an ephemeral keypair to mask the original sender.
 *
 * This works by:
 * 1. Creating a funding instruction that moves SOL from the original wallet
 *    to the ephemeral wallet (to cover tx fees and any SOL transfers).
 * 2. Replacing the fee payer with the ephemeral keypair.
 * 3. Rewriting account references so the ephemeral key appears as the signer
 *    instead of the original wallet.
 *
 * @param tx - The original transaction to mask.
 * @param ephemeral - The ephemeral keypair that will appear as the sender on-chain.
 * @param original - The real agent keypair (used to sign the funding transfer).
 * @param fundingLamports - Lamports to fund the ephemeral account with.
 * @returns A new transaction with the ephemeral keypair as fee payer and signer.
 */
export function maskTransaction(
  tx: Transaction,
  ephemeral: Keypair,
  original: Keypair,
  fundingLamports: number = 10_000_000
): Transaction {
  const masked = new Transaction();

  // Fund the ephemeral wallet from the original wallet
  masked.add(
    createFundingInstruction(
      original.publicKey,
      ephemeral.publicKey,
      fundingLamports
    )
  );

  // Re-map instructions: replace original pubkey references with ephemeral
  for (const ix of tx.instructions) {
    const remappedKeys = ix.keys.map((meta) => {
      if (meta.pubkey.equals(original.publicKey) && meta.isSigner) {
        return {
          pubkey: ephemeral.publicKey,
          isSigner: true,
          isWritable: meta.isWritable,
        };
      }
      return meta;
    });

    masked.add(
      new TransactionInstruction({
        keys: remappedKeys,
        programId: ix.programId,
        data: ix.data,
      })
    );
  }

  masked.feePayer = ephemeral.publicKey;

  return masked;
}
