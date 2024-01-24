"use client";

import { useState } from "react";

import { AccountInterface } from "starknet";

import {
  Config,
  createOffer as createOfferCore,
  OfferV1
} from "@ark-project/core";

import { Status } from "../types";
import useApproveERC20 from "./useApproveERC20";
import useBurnerWallet from "./useBurnerWallet";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useCreateOffer() {
  const [status, setStatus] = useState<Status>("idle");
  const { approveERC20 } = useApproveERC20();
  const [response, setResponse] = useState<bigint | undefined>();
  const owner = useOwner();
  const config = useConfig();
  const arkAccount = useBurnerWallet();

  async function createOffer(
    starknetAccount: AccountInterface,
    offer: OfferV1
  ) {
    if (!arkAccount) {
      throw new Error("No burner wallet.");
    }
    offer.currencyAddress =
      offer.currencyAddress || config?.starknetContracts.eth;
    offer.currencyChainId =
      offer.currencyChainId || (await config?.starknetProvider.getChainId());
    try {
      setStatus("loading");
      const orderHash = await createOfferCore(config as Config, {
        starknetAccount,
        arkAccount,
        offer,
        owner
      });
      setResponse(orderHash);
      setStatus("success");
      await approveERC20(
        starknetAccount,
        offer.startAmount,
        offer.currencyAddress
      );
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { createOffer, status, response };
}
