"use client";

import React from "react";

import { env } from "@/env";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";

import { useFulfillOffer } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface BuyOrderProps {
  token: Token;
  offer: any;
}

const AcceptOffer: React.FC<BuyOrderProps> = ({ token, offer }) => {
  const { address, account } = useAccount();
  const { fulfillOffer, status } = useFulfillOffer();
  const isOwner = areAddressesEqual(token.owner, address);

  if (!account || !isOwner) {
    return null;
  }

  const handleClick = async () => {
    await fulfillOffer({
      starknetAccount: account,
      brokerId: env.NEXT_PUBLIC_BROKER_ID,
      tokenAddress: token.contract_address,
      tokenId: token.token_id,
      orderHash: offer.order_hash
    });
  };

  const isDisabled = status === "loading";
  const isLoading = ["loading", "cancelling"].includes(status);

  console.log("status", status);

  return (
    <Button onClick={handleClick} disabled={isDisabled} size="sm">
      {isLoading ? <ReloadIcon className="animate-spin" /> : "Accept"}
    </Button>
  );
};

export default AcceptOffer;
