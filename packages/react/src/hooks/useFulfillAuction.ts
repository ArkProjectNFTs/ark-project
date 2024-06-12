"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { fulfillAuction } from "@ark-project/core";
import { FulfillAuctionInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import { useConfig } from "./useConfig";

type ApproveERC20Parameters = {
  starknetAccount: AccountInterface;
  startAmount: bigint;
  currencyAddress?: string;
};

export type FulfillAuctionParameters = FulfillAuctionInfo &
  ApproveERC20Parameters;

function useFulfillAuction() {
  const [status, setStatus] = useState<Status>("idle");
  const config = useConfig();

  async function fulfill(parameters: FulfillAuctionParameters) {
    if (!config) {
      throw new Error("Invalid config.");
    }

    setStatus("loading");

    try {
      await fulfillAuction(config, {
        starknetAccount: parameters.starknetAccount,
        fulfillAuctionInfo: {
          orderHash: parameters.orderHash,
          relatedOrderHash: parameters.relatedOrderHash,
          tokenAddress: parameters.tokenAddress,
          tokenId: parameters.tokenId,
          brokerId: parameters.brokerId
        },
        approveInfo: {
          currencyAddress: (parameters.currencyAddress ||
            config?.starknetCurrencyContract) as string,
          amount: BigInt(parameters.startAmount)
        }
      });

      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return { fulfill, status };
}

export { useFulfillAuction };
