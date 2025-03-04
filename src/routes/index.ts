import { getMetadata } from './metadata';
import { getMetadataByExtendingMetadata } from './extending';
import { formatToERC1155, formatToERC721 } from '../util/metadata';
import { YoursMetadataStandard } from '../types/token-info';
import { downloadIpfsFile } from '../services/ipfs';
import { getTokenTargetByCollectionAndERC721TokenId } from '../services/blockchain';

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

const parseStandardAndUri = (uri: string): { full: boolean, standard: Standard, uri: string } => {
  if (uri.startsWith('erc721/full')) {
    return { full: true, standard: 'erc721', uri: uri.replace('erc721/full/', '') };
  } else if (uri.startsWith('erc1155/full')) {
    return { full: true, standard: 'erc1155', uri: uri.replace('erc1155/full/', '') };
  } else if (uri.startsWith('erc721/')) {
    return { full: false, standard: 'erc721', uri: uri.replace('erc721/', '') };
  } else if (uri.startsWith('erc1155/')) {
    return { full: false, standard: 'erc1155', uri: uri.replace('erc1155/', '') };
  } else if (uri.startsWith('yours/')) {
    return { full: true, standard: 'yours', uri: uri.replace('yours/', '') };
  } else {
    // If no standard prefix is found, use the entire URI as ipfsUri
    return { full: false, standard: 'not_specified', uri: uri };
  }
}

const formatMetadata = (standard: Standard, full: boolean, metadata: YoursMetadataStandard) => {
  if (standard === 'erc721' || (standard === 'not_specified' && metadata.yours.modules.includes('erc721'))) {
    return formatToERC721(metadata, full);
  } else if (standard === 'erc1155' || (standard === 'not_specified' && metadata.yours.modules.includes('erc1155'))) {
    return formatToERC1155(metadata, full);
  }

  return metadata;
}

export const handleERC721TokenMetadataRoute = async (path: string, corsHeaders: Record<string, string>) => {
  // Remove leading slash and split
  const decodedPath = decodeURIComponent(path).replace('/erc721/', 'erc721/'); //.replace(/^\//, '').split('/');
  const { full, standard, uri } = parseStandardAndUri(decodedPath);

  const parts = uri.split('/');
  if (parts.length !== 2) {
    return new Response('Invalid parameters', {
      status: 400,
      headers: corsHeaders
    });
  }

  const [collection, token_id] = parts as [string, string];

  console.log('standard', standard);
  console.log('collection', collection);
  console.log('token_id', token_id);

  if (!collection || !token_id || standard !== 'erc721') {
    return new Response('Invalid parameters', {
      status: 400,
      headers: corsHeaders
    });
  }

  const tokenTarget = await getTokenTargetByCollectionAndERC721TokenId(collection, BigInt(token_id));
  if (!tokenTarget) {
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }

  const metadata = await getMetadata(standard, tokenTarget.id);
  if (!metadata) {
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }

  const transformedMetadata = transformBuffers(formatMetadata(standard, full, metadata));
  return Response.json(transformedMetadata, {
    headers: corsHeaders
  });
};

export const handleExtendingMetadataRoute = async (path: string, corsHeaders: Record<string, string>) => {
  const preparedUri = path.replace('/ext/', '');
  const decodedUri = decodeURIComponent(preparedUri);
  const { standard, uri, full } = parseStandardAndUri(decodedUri);

  const metadata = await getMetadataByExtendingMetadata(standard, uri);

  if (!metadata) {
    if (uri.startsWith('http')) {
      const content = await fetch(uri);

      if (content.headers.get('Content-Type') === 'application/json') {
        const transformedData = transformBuffers(await content.json());
        return Response.json(transformedData, {
          headers: corsHeaders
        });
      } else {
        const data = await content.arrayBuffer();
        return new Response(data, {
          headers: {
            ...corsHeaders,
            'Content-Type': content.headers.get('Content-Type') || 'application/octet-stream',
          }
        });
      }
    }

    const ipfsContent = await downloadIpfsFile(uri);
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

  const transformedMetadata = transformBuffers(formatMetadata(standard, full, metadata));
  return Response.json(transformedMetadata, {
    headers: corsHeaders
  });
}
