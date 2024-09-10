"use client";

import { useQuery } from "@tanstack/react-query";

import { getDefaultCreatorFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useDefaultCreatorFees() {
  const config = useConfig();
  const query = useQuery({
    queryKey: ["getDefaultCreatorFees"],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      const fees = await getDefaultCreatorFees(config);

      return fees;
    }
  });

  return query;
}

export { useDefaultCreatorFees };
