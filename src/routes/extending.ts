import { getTokenTargetByExtendingMetadata } from "../services/blockchain";
import { getMetadata } from "./metadata";

export async function getMetadataByExtendingMetadata(uri: string) {
  const tokenTarget = await getTokenTargetByExtendingMetadata(uri);
  console.log(`Token target: ${tokenTarget}`);
  if (!tokenTarget) return null;

  return getMetadata(tokenTarget.id);
}
