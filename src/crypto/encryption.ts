import nacl from 'tweetnacl';

/** Keypair used for agent-to-agent encrypted communication. */
export interface ChannelKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generates a new x25519 keypair for encrypted channel communication.
 * Uses tweetnacl's box keypair generation.
 */
export function generateChannelKeys(): ChannelKeyPair {
  const pair = nacl.box.keyPair();
  return {
    publicKey: pair.publicKey,
    secretKey: pair.secretKey,
  };
}

/**
 * Encrypts a plaintext message for a specific recipient using NaCl box.
 *
 * @param message - The plaintext string to encrypt.
 * @param recipientPublicKey - The recipient's x25519 public key.
 * @param senderSecretKey - The sender's x25519 secret key.
 * @returns An object containing the encrypted payload and the random nonce.
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { encrypted: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = new TextEncoder().encode(message);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  return { encrypted, nonce };
}

/**
 * Decrypts a message that was encrypted with NaCl box.
 *
 * @param encrypted - The encrypted payload bytes.
 * @param nonce - The nonce used during encryption.
 * @param senderPublicKey - The sender's x25519 public key.
 * @param recipientSecretKey - The recipient's x25519 secret key.
 * @returns The decrypted plaintext string.
 * @throws If decryption fails (wrong keys, tampered data, etc).
 */
export function decryptMessage(
  encrypted: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const decrypted = nacl.box.open(
    encrypted,
    nonce,
    senderPublicKey,
    recipientSecretKey
  );

  if (!decrypted) {
    throw new Error('Decryption failed: invalid keys or tampered ciphertext');
  }

  return new TextDecoder().decode(decrypted);
}
