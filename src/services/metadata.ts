import { Standard, MimeDataResponse } from '../types/metadata';
import { YoursMetadataStandard } from '../types/token-info';
import { downloadIpfsFile } from './ipfs';
import { formatToERC1155, formatToERC721 } from '../util/metadata';
import { getMetadataByExtendingMetadata } from '../routes/extending';

export const formatMetadata = (standard: Standard, full: boolean, metadata: YoursMetadataStandard) => {
  if (standard === 'erc721' || (standard === 'not_specified' && metadata.yours.modules.includes('erc721'))) {
    return formatToERC721(metadata, full);
  } else if (standard === 'erc1155' || (standard === 'not_specified' && metadata.yours.modules.includes('erc1155'))) {
    return formatToERC1155(metadata, full);
  }
  return metadata;
};

export const fetchData = async (uri: string, stream = false): Promise<MimeDataResponse | null> => {
  if (uri.startsWith('http')) {
    const response = await fetch(uri);
    const contentType = response.headers.get('Content-Type');

    if (contentType === 'application/json') {
      return {
        data: await response.json(),
        mimeType: contentType,
        type: 'json'
      };
    }

    if (stream) {
      return {
        data: response.body as ReadableStream<Uint8Array>,
        mimeType: contentType || 'application/octet-stream',
        type: 'stream',
        contentLength: Number(response.headers.get('Content-Length') || 0)
      };
    }

    return {
      data: new Uint8Array(await response.arrayBuffer()),
      mimeType: contentType || 'application/octet-stream',
      type: 'binary'
    };
  }

  const ipfsContent = await downloadIpfsFile(uri, stream);
  if (!ipfsContent) return null;

  if (ipfsContent.isStream && ipfsContent.data instanceof ReadableStream) {
    return {
      data: ipfsContent.data,
      mimeType: ipfsContent.mimeType,
      type: 'stream',
      contentLength: ipfsContent.metadata?.size
    };
  }

  return {
    data: ipfsContent.data,
    mimeType: ipfsContent.mimeType,
    type: ipfsContent.mimeType === 'application/json' ? 'json' : 'binary'
  };
};

export const getFormattedMetadata = async (standard: Standard, uri: string, full: boolean, stream = false): Promise<MimeDataResponse | null> => {
  const metadata = await getMetadataByExtendingMetadata(uri);
  
  if (!metadata) {
    return fetchData(uri, stream);
  }

  return {
    data: formatMetadata(standard, full, metadata),
    mimeType: 'application/json',
    type: 'metadata'
  };
}; 