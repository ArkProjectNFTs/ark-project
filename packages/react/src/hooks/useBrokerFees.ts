"use client";

import { useQuery } from "@tanstack/react-query";

import { getBrokerFees } from "@ark-project/core";

import { useConfig } from "./useConfig";

interface UseBrokerFeesParams {
  brokerAdress: string;
}

function useBrokerFees({ brokerAdress }: UseBrokerFeesParams) {
  const config = useConfig();

  return useQuery({
    queryKey: ["getBrokerFees", brokerAdress],
    queryFn: async () => {
      if (!config) {
        throw new Error("Config not found");
      }

      return getBrokerFees(config, brokerAdress);
    }
  });
}

export { useBrokerFees };
