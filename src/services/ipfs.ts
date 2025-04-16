import { create } from 'ipfs-http-client';
import { config } from '../config';
import { ipfsRequestsTotal, logger } from '../monitoring';
import { Buffer } from 'buffer';

const ipfs = create({
  url: config.ipfs.url,
  timeout: 10000,
})

const ipfsFallback = create({
  url: 'https://ipfs.io/api/v0',
  timeout: 255 * 1000,
});

logger.info('IPFS API Created', { apiUrl: config.ipfs.url })

// Set of common image extensions and their MIME types
const IMAGE_TYPES = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.avif', 'image/avif'],
]);

// Store discovered image CIDs
export const discoveredImageCids = new Set<string>();

export type IpfsContent = {
  data: Uint8Array | object | ReadableStream<Uint8Array>;
  mimeType: string;
  isStream?: boolean;
  metadata?: {
    cid: string;
    size: number;
    type: string;
    path: string;
  };
}

function extractCidFromIpfsUrl(ipfsUrl: string): string | null {
  const match = ipfsUrl.match(/ipfs:\/\/(.*?)(\/|$)/);
  return match ? match[1] : null;
}

async function getIpfsContent(cid: string, path: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of ipfs.cat(`/ipfs/${cid}${path ? `/${path}` : ''}`)) {
    chunks.push(chunk);
  }
  
  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function getFileExtension(path: string): string {
  const match = path.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function isImagePath(path: string): boolean {
  const ext = getFileExtension(path);
  return IMAGE_TYPES.has(ext);
}

/**
 * Creates a ReadableStream from IPFS content
 * This allows streaming large files without loading them entirely into memory
 */
function streamIpfsContent(cid: string, path: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of ipfs.cat(`/ipfs/${cid}${path ? `/${path}` : ''}`)) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

async function getIpfsContentWithClient(client: ReturnType<typeof create>, cid: string, path: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of client.cat(`/ipfs/${cid}${path ? `/${path}` : ''}`)) {
    chunks.push(chunk);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function streamIpfsContentWithClient(client: ReturnType<typeof create>, cid: string, path: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of client.cat(`/ipfs/${cid}${path ? `/${path}` : ''}`)) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

export async function downloadIpfsFile(uri: string, stream = false): Promise<IpfsContent> {
  async function tryDownload(client: ReturnType<typeof create>): Promise<IpfsContent> {
    const cleanUri = uri.replace('ipfs://', '');
    const [cid, ...pathParts] = cleanUri.split('/');
    const path = pathParts.join('/');
    const stats = await client.files.stat(`/ipfs/${cid}${path ? `/${path}` : ''}`);
    logger.info('IPFS stats', { stats });
    if (stats.type === 'directory') {
      const files = [];
      for await (const file of client.ls(`/ipfs/${cid}${path ? `/${path}` : ''}`)) {
        files.push({
          name: file.name,
          type: file.type,
          size: file.size,
          cid: file.cid.toString()
        });
      }
      return {
        data: {
          type: 'directory',
          path: path || '/',
          files
        },
        mimeType: 'application/json',
        metadata: {
          cid: stats.cid.toString(),
          size: stats.size,
          type: stats.type,
          path: path || '/'
        }
      };
    }
    if (stream) {
      ipfsRequestsTotal.inc({ status: 'success' });
      logger.info('IPFS streaming started', { 
        uri,
        cid: stats.cid.toString(),
        size: stats.size,
        type: stats.type
      });
      if (isImagePath(cid + (path ? '/' + path : ''))) {
        const ext = getFileExtension(cid + (path ? '/' + path : ''));
        return {
          data: streamIpfsContentWithClient(client, cid, path),
          isStream: true,
          mimeType: IMAGE_TYPES.get(ext) || 'application/octet-stream',
          metadata: {
            cid: stats.cid.toString(),
            size: stats.size,
            type: stats.type,
            path: path || '/'
          }
        };
      }
      return {
        data: streamIpfsContentWithClient(client, cid, path),
        isStream: true,
        mimeType: 'application/octet-stream',
        metadata: {
          cid: stats.cid.toString(),
          size: stats.size,
          type: stats.type,
          path: path || '/'
        }
      };
    }
    const content = await getIpfsContentWithClient(client, cid, path);
    ipfsRequestsTotal.inc({ status: 'success' });
    logger.info('IPFS download complete', { 
      uri,
      cid: stats.cid.toString(),
      size: stats.size,
      type: stats.type
    });
    if (isImagePath(cid + (path ? '/' + path : ''))) {
      const ext = getFileExtension(cid + (path ? '/' + path : ''));
      return {
        data: content,
        mimeType: IMAGE_TYPES.get(ext) || 'application/octet-stream',
        metadata: {
          cid: stats.cid.toString(),
          size: stats.size,
          type: stats.type,
          path: path || '/'
        }
      };
    }
    try {
      const contentStr = new TextDecoder().decode(content);
      const jsonContent = JSON.parse(contentStr);
      if (jsonContent.attributes && jsonContent.image) {
        if (jsonContent.image.startsWith('ipfs://')) {
          const imageCid = extractCidFromIpfsUrl(jsonContent.image);
          if (imageCid) {
            discoveredImageCids.add(imageCid);
            logger.debug('Discovered image CID in metadata', { 
              uri,
              imageCid,
              imageUrl: jsonContent.image 
            });
          }
        }
      }
      return {
        data: jsonContent,
        mimeType: 'application/json',
        metadata: {
          cid: stats.cid.toString(),
          size: stats.size,
          type: stats.type,
          path: path || '/'
        }
      };
    } catch (parseError) {
      return {
        data: content,
        mimeType: 'application/octet-stream',
        metadata: {
          cid: stats.cid.toString(),
          size: stats.size,
          type: stats.type,
          path: path || '/'
        }
      };
    }
  }

  async function tryGatewayFallback(): Promise<IpfsContent> {
    const cleanUri = uri.replace('ipfs://', '');
    const [cid, ...pathParts] = cleanUri.split('/');
    const path = pathParts.join('/');
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}${path ? `/${path}` : ''}`;
    logger.info('Trying IPFS gateway fallback', { gatewayUrl });
    const res = await fetch(gatewayUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch from gateway: ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get('content-type') || '';
    const ext = getFileExtension(cid + (path ? '/' + path : ''));
    let mimeType = IMAGE_TYPES.get(ext) || contentType || 'application/octet-stream';
    let data: Uint8Array | object;
    if (mimeType.startsWith('application/json')) {
      const json = await res.json();
      if (json && typeof json === 'object') {
        data = json;
      } else {
        // fallback to bytes if not a valid object
        data = new Uint8Array(await res.arrayBuffer());
        mimeType = 'application/octet-stream';
      }
    } else {
      data = new Uint8Array(await res.arrayBuffer());
    }
    return {
      data,
      mimeType,
      metadata: {
        cid,
        size: (data instanceof Uint8Array) ? data.length : JSON.stringify(data).length,
        type: 'file',
        path: path || '/'
      }
    };
  }

  try {
    logger.info('Starting IPFS download', { uri, stream });
    return await tryDownload(ipfs);
  } catch (error) {
    ipfsRequestsTotal.inc({ status: 'error' });
    logger.error('Failed to download IPFS file from primary IPFS server, retrying with ipfs.io gateway', {
      uri,
      error: error instanceof Error ? error.message : String(error)
    });
    try {
      return await tryGatewayFallback();
    } catch (fallbackError) {
      ipfsRequestsTotal.inc({ status: 'error' });
      logger.error('Failed to download IPFS file from ipfs.io gateway', {
        uri,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });
      throw fallbackError;
    }
  }
}
