"use client";

import { useQuery } from "@tanstack/react-query";

import { getArkFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

function useArkFees() {
  const config = useConfig();

  return useQuery({
    queryKey: ["getArkFees"],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      return getArkFees(config);
    }
  });
}

export { useArkFees };
