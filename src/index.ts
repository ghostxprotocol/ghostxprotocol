// Core client
export { GhostClient } from './core/client';

// Types
export type {
  GhostConfig,
  ExecuteOptions,
  ExecuteResult,
  GhostMessage,
  AgentChannel as AgentChannelInfo,
} from './types';

// Agent communication
export { AgentChannel } from './core/agent-channel';

// Encryption utilities
export {
  generateChannelKeys,
  encryptMessage,
  decryptMessage,
} from './crypto/encryption';
export type { ChannelKeyPair } from './crypto/encryption';
