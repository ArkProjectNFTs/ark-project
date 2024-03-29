"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { useAccount } from "@starknet-react/core";

import { useFulfillOffer } from "@ark-project/react";

import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface BuyOrderProps {
  token: any;
  tokenMarketData: TokenMarketData;
}

const BuyOrder: React.FC<BuyOrderProps> = ({ token, tokenMarketData }) => {
  const { fulfillOffer, status } = useFulfillOffer();
  const { address, account } = useAccount();

  const isOwner = address && areAddressesEqual(token.owner, address);

  if (
    account === undefined ||
    !isOwner ||
    !tokenMarketData ||
    !tokenMarketData.has_offer
  )
    return null;

  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Accept best offer</h1>
      <Button
        onClick={() =>
          fulfillOffer({
            starknetAccount: account,
            brokerId: env.NEXT_PUBLIC_BROKER_ID,
            tokenAddress: token.contract_address,
            tokenId: token.token_id,
            orderHash: tokenMarketData.top_bid.order_hash
            // TODO: add address from the api when it's available
            // currencyAddress: tokenMarketData.top_bid.currency_address,
          })
        }
      >
        {status === "idle" && "Accept bid"}
        {status === "loading" && "Accepting..."}
        {status === "error" && "Error"}
        {status === "success" && "Bought"}
      </Button>
    </div>
  );
};

export default BuyOrder;
