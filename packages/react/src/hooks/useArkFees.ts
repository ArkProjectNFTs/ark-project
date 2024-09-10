"use client";

import { useQuery } from "@tanstack/react-query";

import { getArkFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useArkFees() {
  const config = useConfig();
  const query = useQuery({
    queryKey: ["getArkFees"],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      const fees = await getArkFees(config);

      return fees;
    }
  });

  return query;
}

export { useArkFees };
