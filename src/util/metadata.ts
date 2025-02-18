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
  const properties = metadata.properties as MetadataProperties;
  const result: ERC721Metadata = {
    name: metadata.name,
    attributes: [],
  };

  if (properties.description) result.description = String(properties.description);
  if (properties.image) result.image = String(properties.image);
  if (properties.image_data) result.image_data = String(properties.image_data);
  if (properties.external_url) result.external_url = String(properties.external_url);
  if (properties.background_color) result.background_color = String(properties.background_color);
  if (properties.animation_url) result.animation_url = String(properties.animation_url);
  if (properties.youtube_url) result.youtube_url = String(properties.youtube_url);

  const reservedKeys = new Set([
    'description', 'image', 'image_data', 'external_url',
    'background_color', 'animation_url', 'youtube_url'
  ]);

  result.attributes = Object.entries(properties)
    .filter(([key]) => !reservedKeys.has(key))
    .map(([key, value]): ERC721MetadataAttribute => {
      if (typeof value === 'object' && value !== null && 'value' in value && 'display_type' in value) {
        return {
          trait_type: key,
          value: value.value as ERC721AttributeValue,
          display_type: value.display_type as string,
        };
      }
      return {
        trait_type: key,
        value: value as ERC721AttributeValue,
      };
    });

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
