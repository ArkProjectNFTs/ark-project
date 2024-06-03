"use client";

import { useState } from "react";

import { AccountInterface, constants } from "starknet";

import {
  Config,
  createOffer as createOfferCore,
  OfferV1
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type CreateOfferParameters = {
  starknetAccount: AccountInterface;
  startAmount: bigint;
  tokenAddress: string;
  tokenId: bigint;
  brokerId: string;
  currencyAddress?: string;
  currencyChainId?: constants.StarknetChainId;
  startDate?: number;
  endDate?: number;
};

export default function useCreateOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const config = useConfig();

  async function createOffer(parameters: CreateOfferParameters) {
    try {
      setStatus("loading");
      const orderHash = await createOfferCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        offer: {
          startAmount: parameters.startAmount,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          currencyAddress:
            parameters.currencyAddress || config?.starknetCurrencyAddress,
          currencyChainId:
            parameters.currencyChainId || config?.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as OfferV1,
        approveInfo: {
          currencyAddress:
            parameters.currencyAddress ||
            (config?.starknetCurrencyContract as string),
          amount: parameters.startAmount
        }
      });
      setResponse(orderHash);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { createOffer, status, response };
}
export { useCreateOffer };
