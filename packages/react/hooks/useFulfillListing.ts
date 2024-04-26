"use client";

import { useState } from "react";

import {
  Config,
  fulfillListing as fulfillListingCore
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status, StepStatus } from "../types";
import { ApproveERC20Parameters } from "./useApproveERC20";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";

export type fulfillListingParameters = ApproveERC20Parameters &
  FulfillListingInfo;

export default function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [stepStatus, setStepStatus] = useState<StepStatus>("idle");

  const arkAccount = useBurnerWallet();
  const config = useConfig();

  async function fulfillListing(parameters: fulfillListingParameters) {
    if (!arkAccount) throw new Error("No burner wallet.");
    try {
      setStatus("loading");

      await fulfillListingCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        fulfillListingInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        } as FulfillListingInfo,
        approveInfo: {
          currencyAddress:
            parameters.currencyAddress ||
            (config?.starknetContracts.eth as string),
          amount: parameters.startAmount
        }
      });
      setStatus("success");
      setStepStatus("sold");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStepStatus("error");
    }
  }

  return { fulfillListing, status, stepStatus };
}
