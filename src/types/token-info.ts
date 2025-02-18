import { Project } from "@megayours/sdk";

export type YoursMetadataStandard = {
  name: string;
  properties: Record<string, unknown>;
  yours: {
    blockchains: Buffer[];
    project: Project;
    collection: string;
    modules: string[];
  },
  type: string;
}

export type TokenInfo = {
  metadata: YoursMetadataStandard;
  location: Buffer;
}

export type TokenTarget = {
  project: string;
  collection: string;
  token_id: bigint;
}
