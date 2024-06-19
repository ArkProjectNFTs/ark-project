"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { fulfillAuction } from "@ark-project/core";
import { FulfillAuctionInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import { useConfig } from "./useConfig";

export type FulfillAuctionParameters = FulfillAuctionInfo & {
  starknetAccount: AccountInterface;
};

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
