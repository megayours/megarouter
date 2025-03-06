import { ParsedUri } from '../types/metadata';
import { DEFAULT_ERROR_HEADERS, DEFAULT_HEADERS } from './headers';

export const transformBuffers = (value: any): any => {
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

export const parseStandardAndUri = (uri: string): ParsedUri => {
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
  } else if (uri.startsWith('full/')) {
    return { full: true, standard: 'not_specified', uri: uri.replace('full/', '') };
  } else {
    return { full: false, standard: 'not_specified', uri };
  }
};

export const createJsonResponse = (data: any) => {
  const transformedData = transformBuffers(data);
  return Response.json(transformedData, {
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' }
  });
};

export const createBinaryResponse = (
  data: Uint8Array,
  mimeType: string,
) => {
  return new Response(data, {
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': mimeType,
      'Content-Length': data.length.toString()
    }
  });
};

export const createErrorResponse = (
  message: string,
  status: number
) => {
  return new Response(message, { status, headers: DEFAULT_ERROR_HEADERS });
};