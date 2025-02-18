import { create } from 'ipfs-http-client';
import { config } from '../config';

const ipfs = create({
  url: config.ipfs.url,
})

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
  data: Uint8Array | object;
  mimeType: string;
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

async function getContent(path: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of ipfs.cat(path)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function getFileExtension(path: string): string {
  const match = path.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function isImagePath(path: string): boolean {
  const ext = getFileExtension(path);
  return IMAGE_TYPES.has(ext);
}

export async function downloadIpfsFile(uri: string): Promise<IpfsContent> {
  try {
    // Remove ipfs:// prefix if present and split into CID and path
    const cleanUri = uri.replace('ipfs://', '');
    const [cid, ...pathParts] = cleanUri.split('/');
    const path = pathParts.join('/');

    const targetPath = cid + (path ? '/' + path : '');

    // Get IPFS stats for the requested path
    const stats = await ipfs.files.stat('/ipfs/' + targetPath);

    // Handle directories
    if (stats.type === 'directory') {
      const files = [];
      for await (const file of ipfs.ls(targetPath)) {
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

    // Get the content
    const content = await getContent(targetPath);

    // If it's an image path, return as binary with appropriate mime type
    if (isImagePath(targetPath)) {
      const ext = getFileExtension(targetPath);
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

    // Try to parse as JSON
    try {
      const contentStr = new TextDecoder().decode(content);
      const jsonContent = JSON.parse(contentStr);

      // If it's NFT metadata (has attributes and image fields)
      if (jsonContent.attributes && jsonContent.image) {
        // Track image CID if it's an IPFS URL
        if (jsonContent.image.startsWith('ipfs://')) {
          const imageCid = extractCidFromIpfsUrl(jsonContent.image);
          if (imageCid) {
            discoveredImageCids.add(imageCid);
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
      // If not valid JSON, return as binary
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
  } catch (error) {
    console.error('Failed to download IPFS file:', error);
    throw error;
  }
}
