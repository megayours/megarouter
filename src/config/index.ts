export const config = {
  port: process.env.PORT || 3000,
  database : {
    url: process.env.DATABASE_URL || 'file:local.db',
  },
  blockchain: {
    directoryNodeUrlPool: process.env.DIRECTORY_NODE_URL_POOL || '',
    gammaChainBlockchainRid: process.env.GAMMA_CHAIN_BLOCKCHAIN_RID || '',
    gammaChainBlockchainRidBuffer: Buffer.from(process.env.GAMMA_CHAIN_BLOCKCHAIN_RID || '', 'hex'),
    megadataBlockchainRid: process.env.MEGADATA_BLOCKCHAIN_RID || '',
    megadataBlockchainRidBuffer: Buffer.from(process.env.MEGADATA_BLOCKCHAIN_RID || '', 'hex'),
  },
  ipfs: {
    url: process.env.IPFS_URL || 'http://localhost:5001',
  }
}
