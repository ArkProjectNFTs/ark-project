"use client";

import { useState } from "react";

import { fulfillAuction } from "@ark-project/core";
import { FulfillAuctionInfo } from "@ark-project/core/src/types";

import { Status, StepStatus } from "../types";
import { ApproveERC20Parameters, useApproveERC20 } from "./useApproveERC20";
import { useBurnerWallet } from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type fulfillAuctionParameters = ApproveERC20Parameters &
  FulfillAuctionInfo;

function useFulfillAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const [stepStatus, setStepStatus] = useState<StepStatus>("idle");
  const { approveERC20, getAllowance } = useApproveERC20();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();
  const config = useConfig();

  async function fulfill(parameters: fulfillAuctionParameters) {
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }

    if (!config) {
      throw new Error("Invalid config.");
    }

    setStatus("loading");

    try {
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

      await fulfillAuction(config, {
        starknetAccount: parameters.starknetAccount,
        arkAccount,
        fulfillAuctionInfo: {
          orderHash: parameters.orderHash,
          relatedOrderHash: parameters.relatedOrderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        },
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

  return { fulfill, status, stepStatus };
}

export { useFulfillAuction };
