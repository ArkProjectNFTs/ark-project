"use client";

import { useState } from "react";

import {
  Config,
  fulfillListing as fulfillListingCore
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import useApproveERC20, { ApproveERC20Parameters } from "./useApproveERC20";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export type fulfillListingParameters = ApproveERC20Parameters &
  FulfillListingInfo;

export default function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const { approveERC20 } = useApproveERC20();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();
  const config = useConfig();
  async function fulfillListing(parameters: fulfillListingParameters) {
    if (!arkAccount) throw new Error("No burner wallet.");
    try {
      setStatus("loading");
      await approveERC20({
        starknetAccount: parameters.starknetAccount,
        startAmount: parameters.startAmount,
        currencyAddress:
          parameters.currencyAddress || config?.starknetContracts.eth
      });
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
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }
  return { fulfillListing, status };
}
