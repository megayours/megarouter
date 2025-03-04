import { getMetadata } from './metadata';
import { formatToERC1155, formatToERC721 } from '../util/metadata';
import { YoursMetadataStandard } from '../types/token-info';
import { getTokenTargetByCollectionAndERC721TokenId } from '../services/blockchain';
import { parseStandardAndUri, createJsonResponse, createErrorResponse } from '../util/response';
import { getFormattedMetadata } from '../services/metadata';

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

export const handleERC721TokenMetadataRoute = async (path: string, corsHeaders: Record<string, string>) => {
  const decodedPath = decodeURIComponent(path).replace('/erc721/', 'erc721/');
  const { full, standard, uri } = parseStandardAndUri(decodedPath);

  const parts = uri.split('/');
  if (parts.length !== 2) {
    return createErrorResponse('Invalid parameters', 400, corsHeaders);
  }

  const [collection, token_id] = parts;
  if (!collection || !token_id || standard !== 'erc721') {
    return createErrorResponse('Invalid parameters', 400, corsHeaders);
  }

  const tokenTarget = await getTokenTargetByCollectionAndERC721TokenId(collection, BigInt(token_id));
  if (!tokenTarget) {
    return createErrorResponse('Not Found', 404, corsHeaders);
  }

  const metadata = await getMetadata(standard, tokenTarget.id);
  if (!metadata) {
    return createErrorResponse('Not Found', 404, corsHeaders);
  }

  const formattedMetadata = formatMetadata(standard, full, metadata);
  return createJsonResponse(formattedMetadata, corsHeaders);
};

export const handleExtendingMetadataRoute = async (path: string, corsHeaders: Record<string, string>) => {
  const preparedUri = path.replace('/ext/', '');
  const decodedUri = decodeURIComponent(preparedUri);
  const { standard, uri, full } = parseStandardAndUri(decodedUri);

  const metadataResponse = await getFormattedMetadata(standard, uri, full);
  if (!metadataResponse) {
    return createErrorResponse('Not Found', 404, corsHeaders);
  }

  if (metadataResponse.mimeType === 'application/json') {
    return createJsonResponse(metadataResponse.data, corsHeaders);
  }

  if (!(metadataResponse.data instanceof Uint8Array)) {
    return createErrorResponse('Invalid binary data', 500, corsHeaders);
  }

  return new Response(metadataResponse.data, {
    headers: {
      ...corsHeaders,
      'Content-Type': metadataResponse.mimeType || 'application/octet-stream',
      'Content-Length': metadataResponse.data.length.toString(),
      'Cache-Control': 'public, max-age=31536000'
    }
  });
};
