import { locateMetadata } from "../services/token-locator";
import { findTokenMetadata, insertTokenMetadata, updateTokenLocation } from "../db";
import { config } from "../config";

export async function getMetadata(standard: string, project: string, collection: string, tokenId: string) {
  // Try to find token in our index first
  const indexedToken = await findTokenMetadata(standard, project, collection, tokenId);
  const startingChain = indexedToken
    ? indexedToken.blockchain_rid
    : config.blockchain.gammaChainBlockchainRidBuffer;

  const tokenIdBigInt = BigInt(tokenId);
  const tokenInfo = await locateMetadata(startingChain, project, collection, tokenIdBigInt);
  if (!tokenInfo) return null;

  // Update or create index entry
  if (indexedToken) {
    await updateTokenLocation(indexedToken.id, tokenInfo.location);
  } else {
    await insertTokenMetadata(
      standard,
      project,
      collection,
      tokenId,
      tokenInfo.location.toString('hex')
    );
  }

  return tokenInfo.metadata;
}
