import { TokenInfo } from "../types/token-info";
import { getMetadata, getRecentTargetChain } from "./blockchain";

export const locateMetadata = async (recentChainRid: Buffer, project: string, collection: string, tokenId: bigint): Promise<TokenInfo | null> => {
  let chainRidToSearch: Buffer | null = recentChainRid;
  let metadata: any = null;

  while (!metadata && chainRidToSearch) {
    metadata = await getMetadata(chainRidToSearch, project, collection, tokenId);
    if (metadata) return { metadata, location: chainRidToSearch };

    chainRidToSearch = await getRecentTargetChain(chainRidToSearch, project, collection, tokenId);
  }

  console.log('❌ Metadata not found for token', project, collection, tokenId);
  return null;
};
