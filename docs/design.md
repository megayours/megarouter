# Overview

Mega Router is an API with logic to route incoming metadata requests towards the blockchain where the token currently resides.

```
https://router.megayours.com/metadata/<standard>/<project>/<collection>/<token_id>
```

# Requirements
- Must be able to find the token no matter which Chromia chain it has been transferred to
- Must be able to present the metadata in different formats depending on the requested standard
- Must provide a deterministic tokenUri where the is appended at the end

# Token Locating
The Mega Router has an internal database index where it keep track of the most recent known location of the token.

The router is lazy in its nature. If no one has requested metadata for the token then index won't contain information about the most recent known location either.

The router will start by querying its index of the most recent known location, if not found there then Gamma Chain since that is the issuing chain for external tokens. If the token is not in 
Gamma Chain then it will query the history to figure out where it was sent. Then it will query the receiving blockchain and repeat the cycle until the token has been located. After the token has been located it will update its index and return the metadata.

This effectively turns the router into a cache since the next request to fetch the metadata will be much faster since the index can be used as the entry point.

```mermaid
  REQ((Metadata Request)) --> DB(Query Index)
  DB --> CACHED{cached?}
  CACHED -->|no| CACHED_NO(Query)
  CACHED_NO -->|Gamma| QUERY_CHAIN(Chain)
  CACHED -->|yes| CACHED_YES(Query)
  CACHED_YES -->|Recent| QUERY_CHAIN
  QUERY_CHAIN --> TOKEN_IN_CHAIN{in chain?}
  TOKEN_IN_CHAIN -->|no| TOKEN_IN_CHAIN_NO(Query History)
  TOKEN_IN_CHAIN_NO --> NEXT_CHAIN(Next Chain)
  NEXT_CHAIN --> QUERY_NEXT_CHAIN(Query)
  QUERY_NEXT_CHAIN --> TOKEN_IN_CHAIN
  TOKEN_IN_CHAIN -->|yes| UPDATE_INDEX(Update index)
  UPDATE_INDEX --> RETURN_METADATA((Return metadata))
```