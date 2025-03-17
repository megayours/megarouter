import { TokenInfo } from "../types/token-info";
import { getMetadata, getRecentTargetChain } from "./blockchain";
import { tokenLocationsTotal, logger } from "../monitoring";

export const locateMetadata = async (recentChainRid: Buffer, id: Buffer): Promise<TokenInfo | null> => {
  let chainRidToSearch: Buffer | null = recentChainRid;
  let metadata: any = null;

  logger.info('Starting token location search', {
    id: id.toString('hex'),
    startChain: recentChainRid.toString('hex')
  });

  while (!metadata && chainRidToSearch) {
    try {
      metadata = await getMetadata(chainRidToSearch, id);
      if (metadata) {
        tokenLocationsTotal.inc({
          status: 'success',
          blockchain: chainRidToSearch.toString('hex')
        });
        logger.info('Token located', {
          id: id.toString('hex'),
          blockchain: chainRidToSearch.toString('hex'),
          metadata
        });
        return { metadata, location: chainRidToSearch };
      }

      const nextChain = await getRecentTargetChain(chainRidToSearch, id);

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
        id: id.toString('hex'),
        blockchain: chainRidToSearch.toString('hex'),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  tokenLocationsTotal.inc({ status: 'not_found', blockchain: 'none' });
  logger.warn('Metadata not found for token', {
    id: id.toString('hex'),
  });
  return null;
};
