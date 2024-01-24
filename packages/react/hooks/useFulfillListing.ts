"use client";

import { useState } from "react";

import { AccountInterface, BigNumberish } from "starknet";

import {
  Config,
  fulfillListing as fulfillListingCore
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import useApproveERC20 from "./useApproveERC20";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useFulfillListing() {
  const [status, setStatus] = useState<Status>("idle");
  const { approveERC20 } = useApproveERC20();
  const config = useConfig();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();

  async function fulfillListing(
    starknetAccount: AccountInterface,
    fulfillListingInfo: FulfillListingInfo,
    amount: BigNumberish,
    currency_address: BigNumberish
  ) {
    if (!arkAccount) throw new Error("No burner wallet.");

    try {
      setStatus("loading");
      await fulfillListingCore(config as Config, {
        starknetAccount,
        arkAccount,
        fulfillListingInfo,
        owner
      });
      setStatus("success");
      await approveERC20(starknetAccount, amount, currency_address);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return { fulfillListing, status };
}
