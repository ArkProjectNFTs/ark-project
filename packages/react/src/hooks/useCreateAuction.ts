"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { AuctionV1, Config, createAuction } from "@ark-project/core";

import { Status } from "../types";
import { useApproveERC721 } from "./useApproveERC721";
import { useBurnerWallet } from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type CreateAuctionParameters = {
  starknetAccount: AccountInterface;
} & AuctionV1;

export default function useCreateAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const { approveERC721 } = useApproveERC721();
  const config = useConfig();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();

  async function create(parameters: CreateAuctionParameters) {
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }

    setStatus("loading");

    try {
      await approveERC721(
        parameters.starknetAccount,
        parameters.tokenId,
        parameters.tokenAddress
      );
    } catch (error) {
      console.error("error: approval failed", error);
      setStatus("error");
      return;
    }

    try {
      const orderHash = await createAuction(config as Config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount,
        order: {
          startAmount: parameters.startAmount,
          endAmount: parameters.endAmount,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          currencyAddress:
            parameters.currencyAddress || config?.starknetContracts.eth,
          currencyChainId:
            parameters.currencyChainId || config?.starknetProvider.getChainId(),
          brokerId: parameters.brokerId,
          startDate: parameters.startDate,
          endDate: parameters.endDate
        } as AuctionV1,
        owner
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
