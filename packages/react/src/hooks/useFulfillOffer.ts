"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { Config, fulfillOffer as fulfillOfferCore } from "@ark-project/core";
import { FulfillOfferInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type FulfillOfferParameters = {
  starknetAccount: AccountInterface;
} & FulfillOfferInfo;

function useFulfillOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const config = useConfig();

  async function fulfillOffer(parameters: FulfillOfferParameters) {
    try {
      setStatus("loading");
      await fulfillOfferCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        fulfillOfferInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        } as FulfillOfferInfo,
        approveInfo: {
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId
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

export { useFulfillOffer };
