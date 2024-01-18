"use client";

import { useState } from "react";

import { Account, AccountInterface } from "starknet";

import {
  Config,
  createOffer as createOfferCore,
  OfferV1
} from "@ark-project/core";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";
import { useConfig } from "./useConfig";
import { useOwner } from "./useOwner";

export default function useCreateOffer() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>(undefined);
  const owner = useOwner();
  const config = useConfig();

  async function createOffer(
    starknetAccount: AccountInterface,
    offer: OfferV1
  ) {
    const burner_address = localStorage.getItem("burner_address");
    const burner_private_key = localStorage.getItem("burner_private_key");
    const burner_public_key = localStorage.getItem("burner_public_key");

    if (
      burner_address === null ||
      burner_private_key === null ||
      burner_public_key === null
    ) {
      throw new Error("No burner wallet in local storage");
    }

    try {
      setStatus("loading");
      const orderHash = await createOfferCore(config as Config, {
        starknetAccount,
        arkAccount: new Account(
          rpcProvider,
          burner_address,
          burner_private_key
        ),
        offer,
        owner
      });
      setStatus("success");
      setResponse(orderHash);
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { createOffer, status, response };
}
