"use client";

import React from "react";

import { TokenMarketData } from "@/types";
import { useAccount } from "@starknet-react/core";

import { useFulfillOffer } from "@ark-project/react";

import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface BuyOrderProps {
  token: any;
  tokenMarketData: TokenMarketData;
  tokenOffers: any;
}

const BuyOrder: React.FC<BuyOrderProps> = ({
  token,
  tokenMarketData,
  tokenOffers
}) => {
  // console.log(tokenOffers);
  const { fulfillOffer, status } = useFulfillOffer();
  const { address, account } = useAccount();

  const isOwner = address && areAddressesEqual(token.owner, address);

  // TODO also return null if token doesn't have an offer
  if (
    account === undefined ||
    !isOwner ||
    !tokenOffers
    // TODO: also return null if token doesn't have an listing
    // || !tokenMarketData.is_listed
  )
    return null;

  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Accept best offer</h1>
      <Button
        onClick={() =>
          fulfillOffer({
            starknetAccount: account,
            brokerId: 1,
            tokenAddress: token.contract_address,
            tokenId: token.token_id,
            orderHash: tokenMarketData.order_hash
            // TODO: add address from the api when it's available
            // currencyAddress: tokenMarketData.currency_address,
          })
        }
      >
        {status === "idle" && "Accept bid"}
        {status === "loading" && "Accepting..."}
        {status === "success" && "Bought"}
      </Button>
    </div>
  );
};

export default BuyOrder;
