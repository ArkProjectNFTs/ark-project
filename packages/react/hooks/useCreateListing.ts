import { useState } from "react";

import { Account, AccountInterface, shortString, TypedData } from "starknet";

import {
  createListing as createListingCore,
  ListingV1
} from "@ark-project/core";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";

export default function useCreateListing() {
  const { rpcProvider } = useRpc();
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>(undefined);

  async function createListing(
    starknetAccount: AccountInterface,
    order: ListingV1
  ) {
    // const typedDataValidate: TypedData = {
    //   types: {
    //     StarkNetDomain: [
    //       { name: "name", type: "string" },
    //       { name: "version", type: "felt" },
    //       { name: "chainId", type: "felt" }
    //     ],
    //     Validate: [{ name: "orderhash", type: "felt" }]
    //   },
    //   primaryType: "Validate",
    //   domain: {
    //     name: "ArkProject",
    //     version: "1",
    //     chainId: shortString.encodeShortString("SN_MAIN")
    //   },
    //   message: {
    //     orderhash: "0x0000004f000f"
    //   }
    // };
    // starknetAccount.signMessage(typedDataValidate);

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
      const orderHash = await createListingCore(
        rpcProvider,
        starknetAccount,
        new Account(rpcProvider, burner_address, burner_private_key),
        order
      );
      setStatus("success");
      setResponse(orderHash);
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  return { createListing, status, response };
}
