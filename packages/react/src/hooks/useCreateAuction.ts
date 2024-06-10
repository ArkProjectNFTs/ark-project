"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { AuctionV1, Config, createAuction } from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type CreateAuctionParameters = {
  starknetAccount: AccountInterface;
} & AuctionV1;

export default function useCreateAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const config = useConfig();

  async function create(parameters: CreateAuctionParameters) {
    if (!config) {
      throw new Error("config not loaded");
    }

    setStatus("loading");

    try {
      const orderHash = await createAuction(config as Config, {
        starknetAccount: parameters.starknetAccount,
        order: {
          startAmount: parameters.startAmount,
          endAmount: parameters.endAmount,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          currencyAddress:
            parameters.currencyAddress || config.starknetCurrencyContract,
          currencyChainId:
            parameters.currencyChainId || config.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as AuctionV1,
        approveInfo: {
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId
        }
      });

      setResponse(orderHash);
      setStatus("success");
    } catch (error) {
      console.error("error: failed to create auction", error);
      setStatus("error");
    }
  }

  return { create, status, response };
}

export { useCreateAuction };
