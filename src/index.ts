import { setupDatabase } from './db';
import { handleExtendingMetadataRoute, handleMegadataRoute, handleMegahubRoute, handleSolanaTokenMetadataRoute } from './routes';
import { register, logger, httpRequestsTotal, httpRequestDuration } from './monitoring';
import { DEFAULT_HEADERS } from './util/headers';

// Initialize database
await setupDatabase();

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Create metrics server
Bun.serve({
  port: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : 9090,
  async fetch(req) {
    if (req.method === 'GET' && new URL(req.url).pathname === '/metrics') {
      return new Response(await register.metrics(), {
        headers: { 'Content-Type': register.contentType }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
});

// Create and start the main server
const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  idleTimeout: 255,
  async fetch(req) {
    const startTime = Date.now();
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(path);

    let apiForMetric = '<unknown>';
    try {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: DEFAULT_HEADERS
        });
      }

      let response: Response;

      // Root route
      if (path === '/') {
        response = new Response('Mega Router API', {
          headers: corsHeaders
        });
      }
      // Handle extending metadata route
      else if (path.startsWith('/ext/')) {
        apiForMetric = 'ext';
        response = await handleExtendingMetadataRoute(path);
      }
      else if (path.startsWith('/megadata/')) {
        apiForMetric = 'megadata';
        response = await handleMegadataRoute(path);
      }
      else if (path.startsWith('/solana/')) {
        apiForMetric = 'solana';
        response = await handleSolanaTokenMetadataRoute(path);
      }
      else if (path.startsWith('/megahub/')) {
        apiForMetric = 'megahub';
        response = await handleMegahubRoute(path);
      }
      else {
        response = new Response('Not Found', {
          status: 404,
          headers: corsHeaders
        });
      }

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      httpRequestsTotal.inc({ api: apiForMetric, status: response.status });
      httpRequestDuration.observe({ api: apiForMetric, status: response.status }, duration);

      // Log request
      logger.info('HTTP Request', {
        method: req.method,
        path,
        status: response.status,
        duration
      });

      return response;
    } catch (error) {
      logger.error('Request error', {
        method: req.method,
        path,
        error: error instanceof Error ? error.message : String(error)
      });

      const response = new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders
      });

      httpRequestsTotal.inc({ api: apiForMetric, status: 500 });
      return response;
    }
  }
});

// Start the server
logger.info(`Server is running at ${server.hostname}:${server.port}`);
