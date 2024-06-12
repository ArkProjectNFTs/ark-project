"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  Config,
  createListing as createListingCore,
  ListingV1
} from "@ark-project/core";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type CreateListingParameters = {
  starknetAccount: AccountInterface;
} & ListingV1;

function useCreateListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const config = useConfig();

  async function createListing(parameters: CreateListingParameters) {
    setStatus("loading");

    try {
      const orderHash = await createListingCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        order: {
          startAmount: parameters.startAmount,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          currencyAddress:
            parameters.currencyAddress || config?.starknetCurrencyContract,
          currencyChainId:
            parameters.currencyChainId || config?.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as ListingV1,
        approveInfo: {
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId
        }
      });
      setResponse(orderHash);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return { createListing, status, response };
}

export { useCreateListing };
