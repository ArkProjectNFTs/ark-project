"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { useAccount } from "@starknet-react/core";
import { SiEthereum } from "react-icons/si";
import { formatEther } from "viem";

import { useFulfillListing } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";

interface BuyOrderProps {
  token: Token;
  tokenMarketData: TokenMarketData;
}

const BuyNow: React.FC<BuyOrderProps> = ({ token, tokenMarketData }) => {
  const { fulfillListing, status } = useFulfillListing();
  const { address, account } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);

  if (
    !account ||
    isOwner ||
    !tokenMarketData?.is_listed ||
    tokenMarketData?.status === "FULFILLED"
  ) {
    return null;
  }

  return (
    <Button
      className="w-full"
      onClick={() =>
        fulfillListing({
          starknetAccount: account,
          brokerId: env.NEXT_PUBLIC_BROKER_ID,
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
        <div className="uppercase font-bold">
          {status === "idle" && "BUY NOW"}
          {status === "loading" && "loading"}
          {status === "success" && "Bought"}
          {status === "error" && "Error"}
        </div>
        <Separator orientation="vertical" className="mx-2" />
        <div className="flex items-center space-x-1">
          <div>{formatEther(BigInt(tokenMarketData.start_amount))}</div>
          <SiEthereum />
        </div>
      </div>
    </Button>
  );
};

export default BuyNow;
