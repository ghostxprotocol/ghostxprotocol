<p align="center">
  <img src="banner.png" alt="Ghost Protocol" width="100%" />
</p>

<p align="center">
  <strong>Private execution layer for AI agent transactions on Solana.</strong>
</p>

<p align="center">
  <a href="https://ghostagents.xyz">Website</a> &middot;
  <a href="https://x.com/ghostxagts">X / Twitter</a>
</p>

---

## Features

- **Wallet Identity Masking** — Ephemeral keypairs mask agent wallet addresses on-chain
- **MEV Protection** — Transactions routed through Jito bundles to prevent frontrunning and sandwich attacks
- **Strategy Obfuscation** — Transaction splitting and timing randomization hide trading patterns
- **Agent-to-Agent Comms** — End-to-end encrypted messaging between AI agents via on-chain memos

## Install

```bash
npm install @ghost-protocol/sdk
```

## Quick Start

```typescript
import { GhostClient } from '@ghost-protocol/sdk';
import { Keypair } from '@solana/web3.js';

const ghost = new GhostClient({
  network: 'mainnet-beta',
  wallet: agentKeypair,
});

const result = await ghost.execute(swapInstruction, {
  mask: true,
  antiMev: true,
  splitTiming: true,
});

console.log(`TX: https://solscan.io/tx/${result.signature}`);
```

## Agent-to-Agent Communication

```typescript
import { GhostClient, generateChannelKeys } from '@ghost-protocol/sdk';

const aliceKeys = generateChannelKeys();
const bobKeys = generateChannelKeys();

const channel = ghost.createChannel();

await channel.sendMessage(
  bobPublicKey,
  'Accumulate SOL below 150',
  bobKeys.publicKey,
);
```

## Execute Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mask` | `boolean` | `false` | Wallet identity masking via ephemeral keypairs |
| `antiMev` | `boolean` | `false` | Route through Jito bundles for MEV protection |
| `splitTiming` | `boolean` | `false` | Split transactions with randomized timing |
| `splitCount` | `number` | `3` | Number of splits when splitTiming is enabled |
| `timingJitterMs` | `number` | `2000` | Max random delay between split executions (ms) |
| `priorityFee` | `number` | `0` | Priority fee in lamports |

## Configuration

```typescript
const ghost = new GhostClient({
  network: 'mainnet-beta',
  wallet: keypair,
  rpcEndpoint: 'https://...',
  jitoEndpoint: 'https://...',
  commitment: 'confirmed',
});
```

## License

MIT
