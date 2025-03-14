import { DictPair } from "postchain-client";

export type YoursMetadataStandard = {
  name: string;
  properties: DictPair;
  yours: {
    issuing_chain: Buffer;
    decimals: number;
    modules: string[];
    type: string;
    blockchains: Buffer[];
  },
}

export type TokenInfo = {
  metadata: YoursMetadataStandard;
  location: Buffer;
}

export type TokenTarget = {
  id: Buffer
  issuing_chain: Buffer
}
