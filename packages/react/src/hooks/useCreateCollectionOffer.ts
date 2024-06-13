"use client";

import { useState } from "react";

import { AccountInterface, constants } from "starknet";

import {
  CollectionOfferV1,
  Config,
  createCollectionOffer
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type CreateCollectionOfferParameters = {
  starknetAccount: AccountInterface;
  startAmount: bigint;
  tokenAddress: string;
  brokerId: string;
  currencyAddress?: string;
  currencyChainId?: constants.StarknetChainId;
  startDate?: number;
  endDate?: number;
};

export default function useCreateCollectionOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const config = useConfig();

  async function create(parameters: CreateCollectionOfferParameters) {
    try {
      setStatus("loading");
      const orderHash = await createCollectionOffer(config as Config, {
        starknetAccount: parameters.starknetAccount,
        offer: {
          startAmount: parameters.startAmount,
          tokenAddress: parameters.tokenAddress,
          currencyAddress:
            parameters.currencyAddress || config?.starknetCurrencyContract,
          currencyChainId:
            parameters.currencyChainId || config?.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as CollectionOfferV1,
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

  return { create, status, response };
}

export { useCreateCollectionOffer };
