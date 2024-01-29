"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import { Config, fulfillOffer as fulfillOfferCore } from "@ark-project/core";
import { FulfillOfferInfo } from "@ark-project/core/src/types";

import { Status } from "../types";
import useApproveERC721 from "./useApproveERC721";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useFulfillOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const { approveERC721 } = useApproveERC721();
  const owner = useOwner();
  const config = useConfig();
  const arkAccount = useBurnerWallet();

  async function fulfillOffer(
    starknetAccount: AccountInterface,
    fulfillOfferInfo: FulfillOfferInfo
  ) {
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }

    try {
      setStatus("loading");
      await fulfillOfferCore(config as Config, {
        starknetAccount,
        arkAccount,
        fulfillOfferInfo,
        owner
      });
      setStatus("success");
      await approveERC721(
        starknetAccount,
        fulfillOfferInfo.token_id,
        fulfillOfferInfo.token_address
      );
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return { fulfillOffer, status };
}
