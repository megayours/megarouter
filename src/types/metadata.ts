import { YoursMetadataStandard } from './token-info';

export type Standard = 'erc721' | 'erc1155' | 'yours' | 'not_specified';

export type ParsedUri = {
  full: boolean;
  standard: Standard;
  uri: string;
};

export type DataType = 'metadata' | 'binary' | 'json' | 'stream';

export type MimeDataResponse = {
  type: DataType;
  data: DataType extends 'metadata' 
    ? YoursMetadataStandard 
    : DataType extends 'binary' 
      ? Uint8Array 
      : DataType extends 'stream'
        ? ReadableStream<Uint8Array>
        : unknown;
  mimeType: string;
  contentLength?: number;
}