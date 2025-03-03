import { locateMetadata } from "../services/token-locator";
import { findTokenMetadata, insertTokenMetadata, updateTokenLocation } from "../db";
import { config } from "../config";

export async function getMetadata(standard: string, id: Buffer) {
  // Try to find token in our index first
  const indexedToken = await findTokenMetadata(standard, id);
  const startingChain = indexedToken
    ? indexedToken.blockchain_rid
    : config.blockchain.gammaChainBlockchainRidBuffer;

  const tokenInfo = await locateMetadata(startingChain, id);
  if (!tokenInfo) return null;

  // Update or create index entry
  if (indexedToken) {
    await updateTokenLocation(indexedToken.id, tokenInfo.location);
  } else {
    await insertTokenMetadata(
      standard,
      id,
      tokenInfo.location.toString('hex')
    );
  }

  return tokenInfo.metadata;
}
