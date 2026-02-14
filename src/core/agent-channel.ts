import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { encryptMessage, generateChannelKeys } from '../crypto/encryption';
import { MEMO_PROGRAM_ID } from '../utils/constants';
import type { ChannelKeyPair } from '../crypto/encryption';

/**
 * Provides encrypted agent-to-agent communication over Solana memo transactions.
 * Messages are encrypted with NaCl box before being written on-chain,
 * ensuring only the intended recipient can read the content.
 */
export class AgentChannel {
  private readonly connection: Connection;
  private readonly wallet: Keypair;
  private readonly channelKeys: ChannelKeyPair;

  constructor(connection: Connection, wallet: Keypair) {
    this.connection = connection;
    this.wallet = wallet;
    this.channelKeys = generateChannelKeys();
  }

  /** Returns the public encryption key for this channel. */
  get encryptionPublicKey(): Uint8Array {
    return this.channelKeys.publicKey;
  }

  /**
   * Encrypts a message and sends it on-chain as a memo transaction.
   * The memo data contains the encrypted payload, nonce, and recipient address
   * so the recipient can locate and decrypt messages addressed to them.
   *
   * @param recipientPubkey - The Solana public key of the recipient agent.
   * @param message - The plaintext message to send.
   * @param recipientEncryptionKey - The recipient's x25519 public key for NaCl box.
   * @returns The transaction signature.
   */
  async sendMessage(
    recipientPubkey: PublicKey,
    message: string,
    recipientEncryptionKey: Uint8Array
  ): Promise<string> {
    const { encrypted, nonce } = encryptMessage(
      message,
      recipientEncryptionKey,
      this.channelKeys.secretKey
    );

    // Pack: [1 byte nonce length][nonce][encrypted payload]
    const packedData = Buffer.alloc(1 + nonce.length + encrypted.length);
    packedData[0] = nonce.length;
    packedData.set(nonce, 1);
    packedData.set(encrypted, 1 + nonce.length);

    const memoIx = AgentChannel.createMemoInstruction(packedData);

    const tx = new Transaction().add(memoIx);
    tx.feePayer = this.wallet.publicKey;

    const recentBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = recentBlockhash.blockhash;

    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      this.wallet,
    ]);

    return signature;
  }

  /**
   * Creates a SPL Memo program instruction with the given data.
   *
   * @param data - The memo content as a Buffer.
   * @returns A TransactionInstruction targeting the Memo program.
   */
  static createMemoInstruction(data: Buffer): TransactionInstruction {
    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data,
    });
  }
}
