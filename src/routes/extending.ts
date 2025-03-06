import { getTokenTargetByExtendingMetadata } from "../services/blockchain";
import { getMetadata } from "./metadata";

export async function getMetadataByExtendingMetadata(uri: string) {
  const tokenTarget = await getTokenTargetByExtendingMetadata(uri);
  if (!tokenTarget) return null;

  return getMetadata(tokenTarget.id);
}
