"use client";

import { useState } from "react";

import {
  Config,
  fulfillListing as fulfillListingCore,
  waitForTransactionBlock
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status, StepStatus } from "../types";
import useApproveERC20, { ApproveERC20Parameters } from "./useApproveERC20";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type fulfillListingParameters = ApproveERC20Parameters &
  FulfillListingInfo;

export default function useFulfillListing() {
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
      const approvalResult = await approveERC20({
        starknetAccount: parameters.starknetAccount,
        startAmount: Number(parameters.startAmount) + Number(allowance),
        currencyAddress:
          parameters.currencyAddress || config?.starknetContracts.eth
      });
      await waitForTransactionBlock(config as Config, {
        transactionHash: approvalResult.transaction_hash
      });
      setStepStatus("listing");
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
      setStepStatus("listed");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStepStatus("error");
    }
  }

  return { fulfillListing, status, stepStatus };
}
