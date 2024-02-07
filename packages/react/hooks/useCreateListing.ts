"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  Config,
  createListing as createListingCore,
  ListingV1
} from "@ark-project/core";

import { Status } from "../types";
import useApproveERC721 from "./useApproveERC721";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type CreateListingParameters = {
  starknetAccount: AccountInterface;
} & ListingV1;

export default function useCreateListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const { approveERC721 } = useApproveERC721();
  const config = useConfig();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();

  async function createListing(parameters: CreateListingParameters) {
    if (!arkAccount) throw new Error("No burner wallet.");
    try {
      setStatus("loading");
      await approveERC721(
        parameters.starknetAccount,
        parameters.tokenId,
        parameters.tokenAddress
      );
      const orderHash = await createListingCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount,
        order: {
          startAmount: parameters.startAmount,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          currencyAddress:
            parameters.currencyAddress || config?.starknetContracts.eth,
          currencyChainId:
            parameters.currencyChainId || config?.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as ListingV1,
        owner
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
