import { YoursMetadataStandard } from "../types/token-info";

type ERC721AttributeValue = string | number | boolean;

type ERC721MetadataAttribute = {
  trait_type: string;
  value: ERC721AttributeValue;
  display_type?: string;
};

type ERC721Metadata = {
  name: string;
  description?: string;
  image?: string;
  image_data?: string;
  external_url?: string;
  attributes: ERC721MetadataAttribute[];
  background_color?: string;
  animation_url?: string;
  youtube_url?: string;
};

type MetadataProperties = {
  description?: unknown;
  image?: unknown;
  image_data?: unknown;
  external_url?: unknown;
  background_color?: unknown;
  animation_url?: unknown;
  youtube_url?: unknown;
  [key: string]: unknown;
};

export function formatToERC721(metadata: YoursMetadataStandard): ERC721Metadata {
  const properties = metadata.properties;
  const result: ERC721Metadata = {
    name: metadata.name,
    attributes: [],
  };

  const supportedModules = metadata.yours.modules;

  if (supportedModules.includes('erc721')) {
    const erc721 = metadata.properties.erc721 as ERC721Metadata;
    if (erc721.description) result.description = String(erc721.description);
    if (erc721.image) result.image = String(erc721.image);
    if (erc721.image_data) result.image_data = String(erc721.image_data);
    if (erc721.external_url) result.external_url = String(erc721.external_url);
    if (erc721.background_color) result.background_color = String(erc721.background_color);
    if (erc721.animation_url) result.animation_url = String(erc721.animation_url);
    if (erc721.youtube_url) result.youtube_url = String(erc721.youtube_url);

    for (const attribute of erc721.attributes) {
      result.attributes.push({
        trait_type: attribute.trait_type,
        value: attribute.value,
      });
    }

    metadata.properties.erc721 = undefined;
  }

  for (const module of supportedModules) {
    if (properties[module]) {
      const moduleProperties = properties[module];
      for (const [key, value] of Object.entries(moduleProperties)) {
        result.attributes.push({
          trait_type: `${module}.${key}`,
          value: value,
        });
      }
    }
  }

  return result;
}

type ERC1155Metadata = {
  name: string;
  properties: Record<string, unknown>;
  description?: string;
  image?: string;
  localization?: Record<string, unknown>;
}

export function formatToERC1155(metadata: YoursMetadataStandard): ERC1155Metadata {
  const { properties } = metadata;
  const reservedKeys = new Set(['description', 'image', 'localization']);

  const filteredProperties = Object.entries(properties)
    .filter(([key]) => !reservedKeys.has(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const result: ERC1155Metadata = {
    name: metadata.name,
    properties: filteredProperties,
  };

  if (properties.description) result.description = String(properties.description);
  if (properties.image) result.image = String(properties.image);
  if (properties.localization) result.localization = properties.localization as Record<string, unknown>;

  return result;
}
