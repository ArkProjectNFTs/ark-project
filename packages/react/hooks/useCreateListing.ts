import { useState } from "react";

import {
  Account,
  AccountInterface,
  BigNumberish,
  cairo,
  CallData
} from "starknet";

import {
  createListing as createListingCore,
  ListingV1
} from "@ark-project/core";
import { getContractAddresses } from "@ark-project/core/src/constants";

import { useRpc } from "../components/ArkProvider/RpcContext";
import { Status } from "../types/hooks";
import { useOwner } from "./useOwner";

export default function useCreateListing() {
  const { rpcProvider, network } = useRpc();
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<bigint | undefined>(undefined);
  const owner = useOwner();
  const { STARKNET_EXECUTOR_ADDRESS } = getContractAddresses(network);

  async function authorizeStarknetERC721Transfer(
    tokenAddress: string,
    starknetAccount: AccountInterface,
    tokenId: BigNumberish
  ) {
    await starknetAccount.execute([
      {
        contractAddress: tokenAddress,
        entrypoint: "approve",
        calldata: CallData.compile({
          to: STARKNET_EXECUTOR_ADDRESS,
          token_id: cairo.uint256(tokenId)
        })
      }
    ]);
  }

  async function createListing(
    starknetAccount: AccountInterface,
    order: ListingV1
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

      await authorizeStarknetERC721Transfer(
        order.tokenAddress.toString(),
        starknetAccount,
        order.tokenId
      );

      const orderHash = await createListingCore(
        network,
        rpcProvider,
        starknetAccount,
        new Account(rpcProvider, burner_address, burner_private_key),
        order,
        owner
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
