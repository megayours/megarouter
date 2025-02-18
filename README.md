# MegaRouter

An API service that routes incoming metadata requests to the appropriate blockchain where the token currently resides.

## Features

- Token location tracking across multiple Chromia chains
- Metadata format standardization
- Caching of token locations for improved performance
- RESTful API endpoints for metadata retrieval
- IPFS support

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- Access to Chromia nodes (configuration required)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Set up environment variables (optional):
    ```bash
    DATABASE_URL=your_database_url
    PORT=3000
    IPFS_API=http://localhost:5001
    ```

## Development

Run the development server with hot reload:
```bash
docker compose up -d postgres ipfs
bun dev
```

Run everything in Docker:
```bash
docker compose up -d --build
```

## API Endpoints

### Get Token Metadata
```
GET /metadata/:standard/:project/:collection/:token_id
```

Parameters:
- `standard`: The metadata standard (e.g., "erc721")
- `project`: Project identifier
- `collection`: Collection identifier
- `token_id`: Token identifier

Response:
Token metadata as `application/json` in the requested standard.

### Get Token Metadata by IPFS
```
GET /ipfs/:ipfs_uri
```

Parameters:
- `ipfs_uri`: The IPFS URI of the token metadata

Response:
Supports both `application/json` and other mime types supported by IPFS.

## Architecture

The router follows a lazy loading pattern for token location tracking:
1. Checks internal index for cached location
2. If not found, queries Gamma Chain (issuing chain)
3. If not in Gamma Chain, follows transfer history
4. Updates index upon locating the token
5. Returns standardized metadata
