"use client";

import { useQuery } from "@tanstack/react-query";

import { getCollectionCreatorFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

interface UseCollectionCreatorFeesParams {
  tokenAddress: string;
}

function useCollectionCreatorFees({
  tokenAddress
}: UseCollectionCreatorFeesParams) {
  const config = useConfig();

  return useQuery({
    queryKey: ["getCollectionCreatorFees", tokenAddress],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      const fees = await getCollectionCreatorFees(config, tokenAddress);

      return fees;
    }
  });
}

export { useCollectionCreatorFees };
