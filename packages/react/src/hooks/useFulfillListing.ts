"use client";

import { useState } from "react";

import { AccountInterface, BigNumberish } from "starknet";

import {
  Config,
  fulfillListing as fulfillListingCore
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type ApproveERC20Parameters = {
  starknetAccount: AccountInterface;
  startAmount: BigNumberish;
  currencyAddress?: BigNumberish;
};

export type fulfillListingParameters = ApproveERC20Parameters &
  FulfillListingInfo;

function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const config = useConfig();

  async function fulfillListing(parameters: fulfillListingParameters) {
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
          currencyAddress: (parameters.currencyAddress ||
            config?.starknetContracts.eth) as string,
          amount: parameters.startAmount
        }
      });
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }
  return { fulfillListing, status };
}
export { useFulfillListing };
