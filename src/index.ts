import { setupDatabase } from './db';
import { handleMetadataRoute, handleIpfsRoute } from './routes';

// Initialize database
await setupDatabase();

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Create and start the server
const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Root route
    if (path === '/') {
      return new Response('Mega Router API', {
        headers: corsHeaders
      });
    }

    // Handle metadata route
    if (path.startsWith('/metadata/')) {
      return await handleMetadataRoute(path, corsHeaders);
    }

    // Handle IPFS route
    if (path.startsWith('/ipfs/')) {
      return await handleIpfsRoute(path, corsHeaders);
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
});

// Start the server
console.log(`🚀 Server is running at ${server.hostname}:${server.port}`);
