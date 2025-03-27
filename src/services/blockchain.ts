import { createClient, IClient, RawGtv } from 'postchain-client';
import { config } from '../config';
import { TokenTarget, YoursMetadataStandard } from '../types/token-info';
import { logger } from '../monitoring';

const clients: Map<string, IClient> = new Map();

const blockchainRidToHex = (blockchainRid: Buffer) => {
  return blockchainRid.toString('hex');
}

const getClient = async (blockchainRid: Buffer) => {
  const blockchainRidHex = blockchainRidToHex(blockchainRid);
  if (!clients.has(blockchainRidHex)) {
    logger.info(`Creating new client for blockchainRid`, {
      blockchainRid: blockchainRidHex,
    });
    const client = await createClient({
      directoryNodeUrlPool: config.blockchain.directoryNodeUrlPool.split(','),
      blockchainRid: blockchainRid.toString('hex'),
    });
    clients.set(blockchainRidHex, client);
    return client;
  }

  return clients.get(blockchainRidHex);
};

const executeClientQuery = async <T extends RawGtv>(blockchainRid: Buffer, query: string, args: any) => {
  let attempt = 0;
  while (attempt < 3) {
    try {
      logger.info(`Executing query`, {
        blockchainRid: blockchainRid.toString('hex'),
        query,
      });
      const client = await getClient(blockchainRid);
      return client?.query<T>(query, args);
    } catch (error) {
      logger.warn(`Error executing query`, {
        blockchainRid: blockchainRid.toString('hex'),
        query,
        error,
      });
      clients.delete(blockchainRidToHex(blockchainRid));
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (attempt > 2) {
        logger.error(`Error executing query`, {
          blockchainRid: blockchainRid.toString('hex'),
          query,
          error,
        });
        throw error;
      }
    }
    attempt++;
  }
}

export const getMetadata = async (blockchainRid: Buffer, id: Buffer) => {
  return await executeClientQuery<TokenTarget>(
    blockchainRid,
    'yours.active_metadata',
    {
      id,
      issuing_chain: config.blockchain.abstractionChainBlockchainRidBuffer,
    }
  );
};

export const getTokenTargetByExtendingMetadata = async (uri: string) => {
  logger.info(`Getting token target by extending metadata`, { uri });
  return await executeClientQuery<TokenTarget>(
    config.blockchain.abstractionChainBlockchainRidBuffer,
    'oracle.get_token_target_by_extending_metadata_uri',
    {
      uri
    }
  );
}

export const getTokenTargetByCollectionAndERC721TokenId = async (collection: string, tokenId: bigint) => {
  return await executeClientQuery<TokenTarget>(
    config.blockchain.abstractionChainBlockchainRidBuffer,
    'oracle.get_token_target_by_erc721_collection',
    {
      collection,
      token_id: tokenId,
    }
  );
}

export const getRecentTargetChain = async (blockchainRid: Buffer, id: Buffer): Promise<Buffer | null> => {
  const history = await executeClientQuery<{ data: { blockchain_rid: Buffer }[] }>(
    blockchainRid,
    'yours.get_transfer_history',
    {
      account_id: null,
      id,
      issuing_chain: config.blockchain.abstractionChainBlockchainRidBuffer,
      from_height: null,
      page_cursor: null,
      type: 'sent',
      page_size: 1,
    }
  );

  if (!history || history.data.length === 0) return null;
  return history.data[0].blockchain_rid;
};

export const getMetadataFromSolanaMegadata = async (address: string) => {
  return await executeClientQuery<YoursMetadataStandard>(
    config.blockchain.abstractionChainBlockchainRidBuffer,
    'solana.get_metadata',
    { address }
  );
}

export const getMetadataFromMegadata = async (collection: string, tokenId: string) => {
  logger.info(`Getting metadata from megadata`, { collection, tokenId });
  return await executeClientQuery<YoursMetadataStandard>(
    config.blockchain.abstractionChainBlockchainRidBuffer,
    'megadata.get_metadata',
    { collection: Buffer.from(collection, 'hex'), token_id: tokenId }
  );
}
