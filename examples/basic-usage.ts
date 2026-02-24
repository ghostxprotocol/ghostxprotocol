import { GhostClient } from '../src';
import { Keypair, TransactionInstruction, PublicKey } from '@solana/web3.js';

async function main() {
  const wallet = Keypair.generate();

  const ghost = new GhostClient({
    network: 'devnet',
    wallet,
  });

  const balance = await ghost.getBalance();
  console.log(`Wallet balance: ${balance} SOL`);

  const instruction = new TransactionInstruction({
    keys: [],
    programId: new PublicKey('11111111111111111111111111111111'),
    data: Buffer.alloc(0),
  });

  const result = await ghost.execute(instruction, {
    mask: true,
    antiMev: true,
  });

  console.log(`Signature: ${result.signature}`);
}

main().catch(console.error);
