"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { Config, fulfillOffer as fulfillOfferCore } from "@ark-project/core";
import { FulfillOfferInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import useApproveERC721 from "./useApproveERC721";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";

export type FulfillOfferParameters = {
  starknetAccount: AccountInterface;
} & FulfillOfferInfo;

export default function useFulfillOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const { getApproved } = useApproveERC721();
  const config = useConfig();
  const arkAccount = useBurnerWallet();

  async function fulfillOffer(parameters: FulfillOfferParameters) {
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }
    try {
      setStatus("loading");
      await fulfillOfferCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount,
        fulfillOfferInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        } as FulfillOfferInfo,
        approveInfo: {
          tokenAddress:
            parameters.tokenAddress ||
            (config?.starknetContracts.eth as string),
          tokenId: parameters.tokenId,
          isApproved: await getApproved(
            parameters.starknetAccount,
            parameters.tokenAddress
          )
        }
      });
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }
  return { fulfillOffer, status };
}
