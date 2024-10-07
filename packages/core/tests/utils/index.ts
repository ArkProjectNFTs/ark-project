import { CairoCustomEnum } from "starknet";

import contracts from "../../../../contracts.dev.json";
import { InvalidVariantCairoCustomEnumError } from "../../src/errors/config.js";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

export const STARKNET_NFT_ADDRESS = contracts.nftContract;

export const FEE_TOKEN =
  "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export { contracts };

export function getTypeFromCairoCustomEnum(cairoCustomEnum: CairoCustomEnum) {
  const keyMap = {
    Listing: "LISTING",
    Auction: "AUCTION",
    Offer: "OFFER",
    CollectionOffer: "COLLECTION_OFFER"
  };

  for (const key in cairoCustomEnum.variant) {
    if (cairoCustomEnum.variant[key as VariantKey] !== undefined) {
      return keyMap[key as VariantKey] || "Unknown";
    }
  }

  throw new InvalidVariantCairoCustomEnumError({ docsPath: "" });
}
