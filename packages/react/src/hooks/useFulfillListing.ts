"use client";

import { useState } from "react";

import {
  Config,
  fulfillListing as fulfillListingCore
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status, StepStatus } from "../types";
import { ApproveERC20Parameters, useApproveERC20 } from "./useApproveERC20";
import { useBurnerWallet } from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type fulfillListingParameters = ApproveERC20Parameters &
  FulfillListingInfo;

function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [stepStatus, setStepStatus] = useState<StepStatus>("idle");
  const { approveERC20, getAllowance } = useApproveERC20();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();
  const config = useConfig();

  async function fulfillListing(parameters: fulfillListingParameters) {
    if (!arkAccount) throw new Error("No burner wallet.");
    try {
      setStatus("loading");
      const allowance = await getAllowance(
        parameters.starknetAccount,
        parameters.currencyAddress || config?.starknetContracts.eth
      );
      setStepStatus("approving");
      await approveERC20({
        starknetAccount: parameters.starknetAccount,
        startAmount: Number(parameters.startAmount) + Number(allowance),
        currencyAddress:
          parameters.currencyAddress || config?.starknetContracts.eth
      });
      setStepStatus("selling");
      await fulfillListingCore(config as Config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount,
        fulfillListingInfo: {
          orderHash: parameters.orderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        } as FulfillListingInfo,
        owner
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
export { useFulfillListing };
