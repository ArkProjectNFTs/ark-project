import { useState } from "react";

import { Account, AccountInterface } from "starknet";

import { fulfillOffer as fulfillOfferCore } from "@ark-project/core";
import { FulfillOfferInfo } from "@ark-project/core/src/types";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";
import { useOwner } from "./useOwner";

export default function useFulfillOffer() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");
  const owner = useOwner();
  async function fulfillOffer(
    starknetAccount: AccountInterface,
    fulfillOfferInfo: FulfillOfferInfo
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
      await fulfillOfferCore(
        rpcProvider,
        starknetAccount,
        new Account(rpcProvider, burner_address, burner_private_key),
        fulfillOfferInfo,
        owner
      );
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { fulfillOffer, status };
}
