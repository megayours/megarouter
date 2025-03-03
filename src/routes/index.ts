import { getMetadata } from './metadata';
import { getMetadataByIpfs } from './ipfs';
import { formatToERC1155, formatToERC721 } from '../util/metadata';
import { YoursMetadataStandard } from '../types/token-info';
import { downloadIpfsFile } from '../services/ipfs';

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

const parseStandardAndIpfsUri = (uri: string): { standard: Standard, ipfsUri: string } => {
  const uriWithoutProtocol = uri.replace('ipfs://', '').replace('https://', '');
  if (uriWithoutProtocol.startsWith('erc721/')) {
    return { standard: 'erc721', ipfsUri: uriWithoutProtocol.replace('erc721/', '') };
  } else if (uriWithoutProtocol.startsWith('erc1155/')) {
    return { standard: 'erc1155', ipfsUri: uriWithoutProtocol.replace('erc1155/', '') };
  } else if (uriWithoutProtocol.startsWith('yours/')) {
    return { standard: 'yours', ipfsUri: uriWithoutProtocol.replace('yours/', '') };
  } else {
    // If no standard prefix is found, use the entire URI as ipfsUri
    return { standard: 'not_specified', ipfsUri: uriWithoutProtocol };
  }
}

const formatMetadata = (standard: Standard, metadata: YoursMetadataStandard) => {
  if (standard === 'erc721' || (standard === 'not_specified' && metadata.yours.modules.includes('erc721'))) {
    return formatToERC721(metadata);
  } else if (standard === 'erc1155' || (standard === 'not_specified' && metadata.yours.modules.includes('erc1155'))) {
    return formatToERC1155(metadata);
  }

  return metadata;
}

export const handleMetadataRoute = async (path: string, corsHeaders: Record<string, string>) => {
  // Remove leading slash and split
  const parts = path.replace('/metadata/', '').replace(/^\//, '').split('/');

  // If we have 3 parts, there's no standard specified
  // If we have 4 parts, standard is specified
  let standard: Standard = 'yours';
  let collection: string;
  let token_id: string;

  if (parts.length === 2) {
    [collection, token_id] = parts;
  } else if (parts.length === 3) {
    [standard, collection, token_id] = parts as [Standard, string, string, string];
  } else {
    return new Response('Invalid parameters', {
      status: 400,
      headers: corsHeaders
    });
  }

  console.log('standard', standard);
  console.log('collection', collection);
  console.log('token_id', token_id);

  if (!collection || !token_id) {
    return new Response('Invalid parameters', {
      status: 400,
      headers: corsHeaders
    });
  }

  if (standard !== 'erc721' && standard !== 'erc1155' && standard !== 'yours') {
    return new Response('Invalid standard', {
      status: 400,
      headers: corsHeaders
    });
  }

  const metadata = await getMetadata(standard, decodedCollection, token_id);
  if (!metadata) {
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }

  const transformedMetadata = transformBuffers(formatMetadata(standard, metadata));
  return Response.json(transformedMetadata, {
    headers: corsHeaders
  });
};

export const handleIpfsRoute = async (path: string, corsHeaders: Record<string, string>) => {
  const uri = path.replace('/ipfs/', '');
  const decodedUri = decodeURIComponent(uri);
  const { standard, ipfsUri } = parseStandardAndIpfsUri(decodedUri);

  const metadata = await getMetadataByIpfs(standard, ipfsUri);
  if (!metadata) {
    const ipfsContent = await downloadIpfsFile(ipfsUri);
    if (!ipfsContent) return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });

    if (ipfsContent.mimeType === 'application/json') {
      const transformedData = transformBuffers(ipfsContent.data);
      return Response.json(transformedData, {
        headers: corsHeaders
      });
    }

    if (!(ipfsContent.data instanceof Uint8Array)) {
      return new Response('Invalid binary data', {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(ipfsContent.data, {
      headers: {
        ...corsHeaders,
        'Content-Type': ipfsContent.mimeType,
        'Content-Length': ipfsContent.data.length.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }

  const transformedMetadata = transformBuffers(formatMetadata(standard, metadata));
  return Response.json(transformedMetadata, {
    headers: corsHeaders
  });
};
