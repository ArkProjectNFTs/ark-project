import { useState } from "react";

import { Account } from "starknet";

import {
  fulfillListing as fulfillListingCore,
  ListingV1
} from "@ark-project/core";
import { FulfillListingInfo } from "@ark-project/core/src/types";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";

export default function useFulfillListing() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");

  async function fulfillListing(fulfillListingInfo: FulfillListingInfo) {
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
      await fulfillListingCore(
        rpcProvider,
        new Account(rpcProvider, burner_address, burner_private_key),
        fulfillListingInfo
      );
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { fulfillListing, status };
}
