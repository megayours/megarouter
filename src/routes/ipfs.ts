import { getTokenTargetByIpfs } from "../services/blockchain";
import { getMetadata } from "./metadata";
export async function getMetadataByIpfs(standard: string, ipfsUri: string) {
  const tokenTarget = await getTokenTargetByIpfs(ipfsUri);
  console.log(`Token target: ${tokenTarget}`);
  if (!tokenTarget) return null;

  return getMetadata(standard, tokenTarget.id);
}
