"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  Config,
  createListing as createListingCore,
  ListingV1
} from "@ark-project/core";

import { Status } from "../types";
import useApproveERC721 from "./useApproveERC721";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useCreateListing() {
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>();
  const { approveERC721 } = useApproveERC721();
  const config = useConfig();
  const owner = useOwner();
  const arkAccount = useBurnerWallet();

  async function createListing(
    starknetAccount: AccountInterface,
    order: ListingV1
  ) {
    if (!arkAccount) throw new Error("No burner wallet.");

    try {
      setStatus("loading");
      const orderHash = await createListingCore(config as Config, {
        starknetAccount,
        arkAccount,
        order,
        owner
      });
      setResponse(orderHash);
      setStatus("success");
      await approveERC721(starknetAccount, order.tokenId, order.tokenAddress);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return { createListing, status, response };
}
