import { GhostClient, generateChannelKeys } from '../src';
import { Keypair, PublicKey } from '@solana/web3.js';

async function main() {
  const wallet = Keypair.generate();

  const ghost = new GhostClient({
    network: 'devnet',
    wallet,
  });

  const senderKeys = generateChannelKeys();
  const recipientKeys = generateChannelKeys();

  const channel = ghost.createChannel();

  const signature = await channel.sendMessage(
    Keypair.generate().publicKey,
    'Target SOL accumulation at 148.5',
    recipientKeys.publicKey,
  );

  console.log(`Message sent: ${signature}`);
}

main().catch(console.error);
