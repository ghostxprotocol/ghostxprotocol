import bs58 from 'bs58';
import { DEFAULT_JITO_ENDPOINT } from '../utils/constants';

/**
 * Builds a JSON-RPC payload for Jito's sendBundle method.
 *
 * @param transactions - Array of serialized transactions as Buffers.
 * @returns The JSON-RPC request body ready to be sent to Jito's block engine.
 */
export function buildJitoBundle(transactions: Buffer[]): object {
  const encodedTransactions = transactions.map((tx) => bs58.encode(tx));

  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'sendBundle',
    params: [encodedTransactions],
  };
}

/**
 * Sends a single serialized transaction to Jito's block engine as a bundle.
 * Jito bundles provide MEV protection by routing transactions through
 * a private mempool, preventing sandwich attacks and frontrunning.
 *
 * @param serializedTx - The fully signed, serialized transaction.
 * @param jitoEndpoint - The Jito block engine URL. Defaults to mainnet.
 * @returns The bundle ID returned by Jito.
 * @throws If the Jito API returns an error or the request fails.
 */
export async function sendWithJito(
  serializedTx: Buffer,
  jitoEndpoint: string = DEFAULT_JITO_ENDPOINT
): Promise<string> {
  const payload = buildJitoBundle([serializedTx]);

  const response = await fetch(jitoEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jito bundle submission failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`Jito RPC error: ${JSON.stringify(result.error)}`);
  }

  return result.result as string;
}

/**
 * Sends multiple serialized transactions as a single atomic Jito bundle.
 *
 * @param transactions - Array of serialized transactions.
 * @param jitoEndpoint - The Jito block engine URL.
 * @returns The bundle ID returned by Jito.
 */
export async function sendBundleWithJito(
  transactions: Buffer[],
  jitoEndpoint: string = DEFAULT_JITO_ENDPOINT
): Promise<string> {
  const payload = buildJitoBundle(transactions);

  const response = await fetch(jitoEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jito bundle submission failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`Jito RPC error: ${JSON.stringify(result.error)}`);
  }

  return result.result as string;
}
