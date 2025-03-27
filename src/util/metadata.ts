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

export function formatToERC721(metadata: YoursMetadataStandard, full: boolean): any {
  const properties = metadata.properties;
  const result: any = {
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
    if (erc721.name) result.name = String(erc721.name);

    if (erc721.attributes) {
      for (const attribute of erc721.attributes) {
        result.attributes.push({
          trait_type: attribute.trait_type,
          value: attribute.value,
        });
      }
    }
  }

  delete properties["erc721"];

  for (const module of Object.keys(properties)) {
    const moduleProperties = properties[module] as Record<string, unknown>;
    for (const [key, value] of Object.entries(moduleProperties)) {
      result.attributes.push({
        trait_type: `${module}.${key}`,
        value: value,
      });
    }
  }

  if (full) {
    result.yours = metadata.yours;
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

export function formatToERC1155(metadata: YoursMetadataStandard, full: boolean): any {
  const { properties } = metadata;
  const reservedKeys = new Set(['description', 'image', 'localization']);

  const filteredProperties = Object.entries(properties)
    .filter(([key]) => !reservedKeys.has(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const result: any = {
    name: metadata.name,
    properties: filteredProperties,
  };

  if (properties.description) result.description = String(properties.description);
  if (properties.image) result.image = String(properties.image);
  if (properties.localization) result.localization = properties.localization as Record<string, unknown>;

  if (full) {
    result.yours = metadata.yours;
  }

  return result;
}
