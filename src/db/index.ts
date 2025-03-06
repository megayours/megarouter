import { SQL } from 'bun';
import { config } from '../config';
import { logger } from '../monitoring';

// Define token index schema
export const tokenIndex = {
  id: 'id',
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
      token_id TEXT NOT NULL,
      blockchain_rid TEXT NOT NULL,
      last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  logger.info('Database setup complete');
}

// Helper functions for database operations
export async function findTokenLocation(tokenId: Buffer) {
  const result = await sql`
    SELECT * FROM token_index
    WHERE token_id = ${tokenId.toString('hex')}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

export async function insertTokenLocation(
  tokenId: Buffer,
  blockchainRid: string
) {
  return await sql`
    INSERT INTO token_index (
      token_id,
      blockchain_rid,
      last_updated
    ) VALUES (
      ${tokenId.toString('hex')}, ${blockchainRid}, CURRENT_TIMESTAMP
    )
  `;
}

export async function updateTokenLocation(id: Buffer, blockchainRid: Buffer) {
  return await sql`
    UPDATE token_index
    SET blockchain_rid = ${blockchainRid.toString('hex')},
    last_updated = CURRENT_TIMESTAMP
    WHERE token_id = ${id.toString('hex')}
  `;
}

export async function deleteTokenLocation(tokenId: Buffer) {
  return await sql`
    DELETE FROM token_index WHERE token_id = ${tokenId.toString('hex')}
  `;
}