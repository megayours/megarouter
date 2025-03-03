import { SQL } from 'bun';
import { config } from '../config';

// Define token index schema
export const tokenIndex = {
  id: 'id',
  standard: 'standard',
  project: 'project',
  collection: 'collection',
  tokenId: 'token_id',
  blockchainRid: 'blockchain_rid',
  lastUpdated: 'last_updated'
} as const;

// Create database client
const sql = SQL(config.database.url);

// Define the token index schema and setup function
export async function setupDatabase() {
  // In a production environment, you would use migrations instead
  await sql`
    CREATE TABLE IF NOT EXISTS token_index (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      standard TEXT NOT NULL,
      project TEXT NOT NULL,
      collection TEXT NOT NULL,
      token_id TEXT NOT NULL,
      blockchain_rid TEXT NOT NULL,
      last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  console.log('✅ Database setup complete');
}

// Helper functions for database operations
export async function findTokenMetadata(standard: string, project: string, collection: string, tokenId: string) {
  const result = await sql`
    SELECT * FROM token_index
    WHERE standard = ${standard}
    AND project = ${project}
    AND collection = ${collection}
    AND token_id = ${tokenId}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

export async function insertTokenMetadata(
  standard: string,
  project: string,
  collection: string,
  tokenId: string,
  blockchainRid: string
) {
  return await sql`
    INSERT INTO token_index (
      standard,
      project,
      collection,
      token_id,
      blockchain_rid,
      last_updated
    ) VALUES (
      ${standard}, ${project}, ${collection}, ${tokenId}, ${blockchainRid}, CURRENT_TIMESTAMP
    )
  `;
}

export async function findTokenMetadataByBlockchainRid(blockchainRid: string) {
  const result = await sql`
    SELECT * FROM token_index
    WHERE blockchain_rid = ${blockchainRid}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

export async function updateTokenLocation(id: string, blockchainRid: Buffer) {
  return await sql`
    UPDATE token_index
    SET blockchain_rid = ${blockchainRid.toString('hex')},
    last_updated = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
} 