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
  const query = useQuery({
    queryKey: [
      "getFeesAmount",
      { fulfillBroker, listingBroker, tokenAddress, tokenId, amount }
    ],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      const fees = await getFeesAmount(config, {
        fulfillBroker,
        listingBroker,
        nftAddress: tokenAddress,
        nftTokenId: tokenId,
        paymentAmount: amount
      });

      return fees;
    }
  });

  return query;
}

export { useFeesAmount };
