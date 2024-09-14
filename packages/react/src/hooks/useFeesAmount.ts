"use client";

import { useQuery } from "@tanstack/react-query";

import { getFeesAmount } from "@ark-project/core";

import { useConfig } from "./useConfig";

interface UseFeesAmountProps {
  fulfillBroker: string;
  listingBroker: string;
  tokenAddress: string;
  tokenId: bigint;
  amount: bigint;
}

function useFeesAmount({
  fulfillBroker,
  listingBroker,
  tokenAddress,
  tokenId,
  amount
}: UseFeesAmountProps) {
  const config = useConfig();

  return useQuery({
    queryKey: [
      "getFeesAmount",
      {
        fulfillBroker,
        listingBroker,
        tokenAddress,
        tokenId: tokenId.toString()
      }
    ],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      return getFeesAmount(config, {
        fulfillBroker,
        listingBroker,
        nftAddress: tokenAddress,
        nftTokenId: tokenId,
        paymentAmount: amount
      });
    }
  });
}

export { useFeesAmount };
