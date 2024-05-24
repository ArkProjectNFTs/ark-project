"use client";

import { useState } from "react";

import { AccountInterface, constants } from "starknet";

import {
  Config,
  createOffer as createOfferCore,
  OfferV1
} from "@ark-project/core";

import { Status } from "../types";
import { useApproveERC20 } from "./useApproveERC20";
import { useBurnerWallet } from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

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
  const { approveERC20 } = useApproveERC20();
  const [response, setResponse] = useState<bigint | undefined>();
  const owner = useOwner();
  const config = useConfig();
  const arkAccount = useBurnerWallet();

  async function createOffer(parameters: CreateOfferParameters) {
    console.log("createOffer", parameters);
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }

    try {
      setStatus("loading");
      await approveERC20({
        starknetAccount: parameters.starknetAccount,
        startAmount: parameters.startAmount,
        currencyAddress:
          parameters.currencyAddress || config?.starknetContracts.eth
      });
      const orderHash = await createOfferCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        offer: {
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
        } as OfferV1,
        approveInfo: {
          currencyAddress:
            parameters.currencyAddress ||
            (config?.starknetContracts.eth as string),
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
