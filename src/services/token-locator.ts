import { TokenInfo } from "../types/token-info";
import { getMetadata, getRecentTargetChain } from "./blockchain";
import { tokenLocationsTotal, logger } from "../monitoring";

export const locateMetadata = async (recentChainRid: Buffer, project: string, collection: string, tokenId: bigint): Promise<TokenInfo | null> => {
  let chainRidToSearch: Buffer | null = recentChainRid;
  let metadata: any = null;

  logger.info('Starting token location search', {
    project,
    collection,
    tokenId: tokenId.toString(),
    startChain: recentChainRid.toString('hex')
  });

  while (!metadata && chainRidToSearch) {
    try {
      metadata = await getMetadata(chainRidToSearch, project, collection, tokenId);
      if (metadata) {
        tokenLocationsTotal.inc({ 
          status: 'success', 
          blockchain: chainRidToSearch.toString('hex')
        });
        logger.info('Token located', {
          project,
          collection,
          tokenId: tokenId.toString(),
          blockchain: chainRidToSearch.toString('hex')
        });
        return { metadata, location: chainRidToSearch };
      }

      const nextChain = await getRecentTargetChain(chainRidToSearch, project, collection, tokenId);
      
      if (!nextChain) {
        break;
      }
      
      chainRidToSearch = nextChain;
    } catch (error) {
      if (!chainRidToSearch) break;
      
      tokenLocationsTotal.inc({ 
        status: 'error', 
        blockchain: chainRidToSearch.toString('hex')
      });
      logger.error('Error locating token', {
        project,
        collection,
        tokenId: tokenId.toString(),
        blockchain: chainRidToSearch.toString('hex'),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  tokenLocationsTotal.inc({ status: 'not_found', blockchain: 'none' });
  logger.warn('Metadata not found for token', {
    project,
    collection,
    tokenId: tokenId.toString()
  });
  return null;
};
