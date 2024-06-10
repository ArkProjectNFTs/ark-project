"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";
import { formatEther } from "viem";

import { useFulfillOffer } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";

interface BuyOrderProps {
  token: Token;
  tokenMarketData: TokenMarketData;
}

const AcceptBestOffer: React.FC<BuyOrderProps> = ({
  token,
  tokenMarketData
}) => {
  const { address, account } = useAccount();
  const { fulfillOffer, status } = useFulfillOffer();
  const isOwner = areAddressesEqual(token.owner, address);

  if (!account || !isOwner || !tokenMarketData?.has_offer) {
    return null;
  }

  const handleClick = async () => {
    try {
      await fulfillOffer({
        starknetAccount: account,
        brokerId: env.NEXT_PUBLIC_BROKER_ID,
        tokenAddress: token.contract_address,
        tokenId: token.token_id,
        orderHash: tokenMarketData.top_bid.order_hash
      });
    } catch (error) {
      console.log("Error accepting offer");
    }
  };

  const isDisabled = status === "loading";
  const isLoading = ["loading", "fulfilling"].includes(status);
  const amount = formatEther(tokenMarketData?.top_bid?.amount);

  return (
    <Button onClick={handleClick} disabled={isDisabled}>
      {isLoading ? (
        <ReloadIcon className="animate-spin" />
      ) : (
        <>
          Accept offer
          <Separator orientation="vertical" className="mx-4" />
          {amount} ETH
        </>
      )}
    </Button>
  );
};

export default AcceptBestOffer;
