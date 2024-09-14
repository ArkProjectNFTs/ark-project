"use client";

import { useQuery } from "@tanstack/react-query";
import { CairoCustomEnum } from "starknet";

import { getOrderType } from "@ark-project/core";

import { useConfig } from "./useConfig";

type VariantKey = "Listing" | "Auction" | "Offer" | "CollectionOffer";

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

  throw new Error("No valid variant found in CairoCustomEnum");
}

function useOrderType({ orderHash }: { orderHash: bigint }) {
  const config = useConfig();

  return useQuery({
    queryKey: ["orderType", orderHash],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      const orderTypeCairo = await getOrderType(config, { orderHash });
      const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

      return orderType;
    }
  });
}

export { useOrderType };
