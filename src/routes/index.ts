import { getMetadata } from './metadata';
import { formatToERC1155, formatToERC721 } from '../util/metadata';
import { YoursMetadataStandard } from '../types/token-info';
import { getMetadataFromMegadata, getMetadataFromSolanaMegadata, getTokenTargetByCollectionAndERC721TokenId } from '../services/blockchain';
import { parseStandardAndUri, createJsonResponse, createErrorResponse } from '../util/response';
import { getFormattedMetadata } from '../services/metadata';
import { DEFAULT_HEADERS } from '../util/headers';
import { logger } from '../monitoring';

type Standard = 'erc721' | 'erc1155' | 'yours' | 'not_specified';

// Function to transform Buffer objects to hex strings in responses
const transformBuffers = (value: any): any => {
  if (Buffer.isBuffer(value)) {
    return value.toString('hex');
  }
  if (Array.isArray(value)) {
    return value.map(transformBuffers);
  }
  if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString('hex');
  }
  if (value && typeof value === 'object') {
    const transformed = { ...value };
    for (const key in transformed) {
      transformed[key] = transformBuffers(transformed[key]);
    }
    return transformed;
  }
  return value;
};

const formatMetadata = (standard: Standard, full: boolean, metadata: YoursMetadataStandard) => {
  if (standard === 'erc721' || (standard === 'not_specified' && metadata.yours.modules.includes('erc721'))) {
    return formatToERC721(metadata, full);
  } else if (standard === 'erc1155' || (standard === 'not_specified' && metadata.yours.modules.includes('erc1155'))) {
    return formatToERC1155(metadata, full);
  }

  return metadata;
}

export const handleERC721TokenMetadataRoute = async (path: string) => {
  const decodedPath = decodeURIComponent(path).replace('/erc721/', 'erc721/');
  const { full, standard, uri } = parseStandardAndUri(decodedPath);

  const parts = uri.split('/');
  if (parts.length !== 2) {
    return createErrorResponse('Invalid parameters', 400);
  }

  const [collection, token_id] = parts;
  if (!collection || !token_id || standard !== 'erc721') {
    return createErrorResponse('Invalid parameters', 400);
  }

  const tokenTarget = await getTokenTargetByCollectionAndERC721TokenId(collection, BigInt(token_id));
  if (!tokenTarget) {
    return createErrorResponse('Not Found', 404);
  }

  const metadata = await getMetadata(tokenTarget.id);
  if (!metadata) {
    return createErrorResponse('Not Found', 404);
  }

  const formattedMetadata = formatMetadata(standard, full, metadata);
  return createJsonResponse(formattedMetadata);
};

export const handleExtendingMetadataRoute = async (path: string) => {
  const preparedUri = path.replace('/ext/', '');
  const decodedUri = decodeURIComponent(preparedUri);
  const { standard, uri, full } = parseStandardAndUri(decodedUri);

  const metadataResponse = await getFormattedMetadata(standard, uri, full, true);
  if (!metadataResponse) {
    return createErrorResponse('Not Found', 404);
  }

  if (metadataResponse.mimeType === 'application/json') {
    return createJsonResponse(metadataResponse.data);
  }

  // Handle streaming response
  if (metadataResponse.type === 'stream' && metadataResponse.data instanceof ReadableStream) {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      'Content-Type': metadataResponse.mimeType || 'application/octet-stream',
      'Cache-Control': CACHE_CONTROL,
      'Transfer-Encoding': 'chunked'
    };
    
    // Add content length if available
    if (metadataResponse.contentLength) {
      headers['Content-Length'] = metadataResponse.contentLength.toString();
    }
    
    return new Response(metadataResponse.data, { headers });
  }

  if (!(metadataResponse.data instanceof Uint8Array)) {
    return createErrorResponse('Invalid binary data', 500);
  }

  return new Response(metadataResponse.data, {
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': metadataResponse.mimeType || 'application/octet-stream',
      'Content-Length': metadataResponse.data.length.toString(),
      'Cache-Control': CACHE_CONTROL
    }
  });
};

export const handleSolanaTokenMetadataRoute = async (path: string) => {
  const address = path.replace('/solana/', '');

  const metadata = await getMetadataFromSolanaMegadata(address);
  if (!metadata) {
    return createErrorResponse('Not Found', 404);
  }

  const formattedMetadata = formatMetadata("erc721", true, metadata);
  return createJsonResponse(formattedMetadata);
}

export const handleMegadataRoute = async (path: string) => {
  const parts = path.replace('/megadata/', '').split('/');
  if (parts.length !== 2) {
    return createErrorResponse('Invalid parameters', 400);
  }

  const [collection, token_id] = parts;

  const metadata = await getMetadataFromMegadata(collection, token_id);
  logger.info(`Metadata: ${JSON.stringify(metadata)}`);
  if (!metadata) {
    return createErrorResponse('Not Found', 404);
  }

  const formattedMetadata = formatMetadata("erc721", true, metadata);
  return createJsonResponse(formattedMetadata);
}

const CACHE_CONTROL = 'public, max-age=31536000';