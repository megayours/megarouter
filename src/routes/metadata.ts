import { locateMetadata } from "../services/token-locator";
import { deleteTokenLocation, findTokenLocation, insertTokenLocation, updateTokenLocation } from "../db";
import { config } from "../config";
import { logger } from "../monitoring";

export async function getMetadata(id: Buffer) {
  // Try to find token in our index first
  const indexedToken = await findTokenLocation(id);
  const startingChain = indexedToken
    ? indexedToken.blockchain_rid
    : config.blockchain.gammaChainBlockchainRidBuffer;

  try {
    const tokenInfo = await locateMetadata(startingChain, id);
    if (!tokenInfo) return null;

    // Update or create index entry
    if (indexedToken) {
      await updateTokenLocation(indexedToken.id, tokenInfo.location);
    } else {
      await insertTokenLocation(
        id,
        tokenInfo.location.toString('hex')
      );
    }

    return tokenInfo.metadata;
  } catch (error) {
    logger.error('Error locating metadata, clearing our index entry', {
      error: error instanceof Error ? error.message : String(error),
      id: id.toString('hex')
    });

    await deleteTokenLocation(id);
  }
}
