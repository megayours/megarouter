import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';
import winston from 'winston';
import LokiTransport from 'winston-loki';

// Get environment label from env vars
const environment = process.env.ENVIRONMENT || 'development';

// Create a new Prometheus Registry with default labels
export const register = new Registry();
register.setDefaultLabels({
  environment,
  service: 'megarouter'
});

// Enable default metrics collection
collectDefaultMetrics({ register });

// Define custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const tokenLocationsTotal = new Counter({
  name: 'token_locations_total',
  help: 'Total number of token locations queried',
  labelNames: ['status', 'blockchain'],
  registers: [register],
});

export const ipfsRequestsTotal = new Counter({
  name: 'ipfs_requests_total',
  help: 'Total number of IPFS requests',
  labelNames: ['status'],
  registers: [register],
});

// Create Winston logger with Loki transport
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'megarouter',
    environment 
  },
  transports: process.env.LOKI_URL ? [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { 
        job: 'megarouter',
        environment 
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err)
    })
  ] : [
    new winston.transports.Console()
  ],
}); 