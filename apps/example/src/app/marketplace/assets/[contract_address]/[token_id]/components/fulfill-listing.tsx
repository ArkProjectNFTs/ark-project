"use client";

import React from "react";

import { TokenMarketData } from "@/types";
import { useAccount } from "@starknet-react/core";
import { SiEthereum } from "react-icons/si";
import { Web3 } from "web3";

import { useFulfillListing } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface BuyOrderProps {
  token: Token;
  tokenMarketData: TokenMarketData;
}

const BuyOrder: React.FC<BuyOrderProps> = ({ token, tokenMarketData }) => {
  const { fulfillListing, status } = useFulfillListing();
  const { address, account } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);

  if (
    account === undefined ||
    isOwner ||
    !tokenMarketData ||
    !tokenMarketData.is_listed
  )
    return null;

  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Buy token</h1>
      <Button
        onClick={() =>
          fulfillListing({
            starknetAccount: account,
            brokerId: 1,
            tokenAddress: token.contract_address,
            tokenId: token.token_id,
            orderHash: tokenMarketData.order_hash,
            // TODO: add address from the api when it's available
            // currencyAddress: tokenMarketData.currency_address,
            startAmount: tokenMarketData.start_amount
          })
        }
      >
        <div className="flex w-full justify-between">
          <p className="uppercase font-bold">
            {status === "idle" && "BUY NOW"}
            {status === "loading" && "Buying..."}
            {status === "success" && "Bought"}
            {status === "error" && "Error"}
          </p>
          <div className="flex items-center space-x-1">
            {Web3.utils.fromWei(tokenMarketData.start_amount, "ether")}{" "}
            <SiEthereum />
          </div>
        </div>
      </Button>
    </div>
  );
};

export default BuyOrder;
