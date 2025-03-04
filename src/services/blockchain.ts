import { createClient, IClient } from 'postchain-client';
import { config } from '../config';
import { TokenTarget } from '../types/token-info';

const clients: Map<string, IClient> = new Map();

const blockchainRidToHex = (blockchainRid: Buffer) => {
  return blockchainRid.toString('hex');
}

const getClient = async (blockchainRid: Buffer) => {
  const blockchainRidHex = blockchainRidToHex(blockchainRid);
  console.log(`Cached clients: ${clients.size}`);
  if (!clients.has(blockchainRidHex)) {
    console.log('🔍 Creating new client for blockchainRid', blockchainRidHex);
    const client = await createClient({
      directoryNodeUrlPool: config.blockchain.directoryNodeUrlPool.split(','),
      blockchainRid: blockchainRid.toString('hex'),
    });
    clients.set(blockchainRidHex, client);
    return client;
  }

  return clients.get(blockchainRidHex);
};

export const getMetadata = async (blockchainRid: Buffer, id: Buffer) => {
  try {
    const client = await getClient(blockchainRid);
    const args = {
      id,
      issuing_chain: config.blockchain.gammaChainBlockchainRidBuffer,
    }
    return client?.query('yours.active_metadata', args);
  } catch (error) {
    clients.delete(blockchainRidToHex(blockchainRid));
    throw error;
  }
};

export const getTokenTargetByExtendingMetadata = async (uri: string) => {
  console.log(`Getting token target by extending metadata: ${uri}`);
  const client = await getClient(config.blockchain.gammaChainBlockchainRidBuffer);
  const args = {
    uri
  }
  return client?.query<TokenTarget>('oracle.get_token_target_by_extending_metadata_uri', args);
}

export const getTokenTargetByCollectionAndERC721TokenId = async (collection: string, tokenId: bigint) => {
  const client = await getClient(config.blockchain.gammaChainBlockchainRidBuffer);
  const args = {
    collection,
    token_id: tokenId,
  }
  return client?.query<TokenTarget>('oracle.get_token_target_by_erc721_collection', args);
}

export const getRecentTargetChain = async (blockchainRid: Buffer, id: Buffer): Promise<Buffer | null> => {
  try {
    const client = await getClient(blockchainRid);
    const history = await client?.query<{ data: { blockchain_rid: Buffer }[] }>('yours.get_transfer_history', {
      account_id: null,
      id,
      issuing_chain: config.blockchain.gammaChainBlockchainRidBuffer,
      from_height: null,
      page_cursor: null,
      type: 'sent',
      page_size: 1,
    });

    console.log('🔍 History', history);

    if (!history || history.data.length === 0) return null;

    return history.data[0].blockchain_rid;
  } catch (error) {
    clients.delete(blockchainRidToHex(blockchainRid));
    throw error;
  }
};
