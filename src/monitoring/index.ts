import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';
import winston from 'winston';
import LokiTransport from 'winston-loki';
import { config } from '../config';

// Create a new Prometheus Registry
export const register = new Registry();

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
  defaultMeta: { service: 'megarouter' },
  transports: [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_URL || 'http://loki:3100',
      labels: { job: 'megarouter' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err)
    })
  ]
}); 