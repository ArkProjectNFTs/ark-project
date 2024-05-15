"use client";

import { useEffect, useState } from "react";

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

function useOrderType({ orderHash }: { orderHash: string }) {
  const [type, setType] = useState<string | null>(null);
  const config = useConfig();

  useEffect(() => {
    const run = async () => {
      if (!config) {
        return;
      }

      const orderTypeCairo = await getOrderType(config, { orderHash });
      const orderType = getTypeFromCairoCustomEnum(orderTypeCairo.orderType);

      setType(orderType);
    };

    run();
  }, [config, orderHash]);

  return type;
}

export { useOrderType };
