"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";
import { formatEther } from "viem";

import { useFulfillAuction, useFulfillOffer } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";

interface BuyOrderProps {
  token: Token;
  tokenMarketData: TokenMarketData;
  isAuction: boolean;
}

const AcceptBestOffer: React.FC<BuyOrderProps> = ({
  token,
  tokenMarketData,
  isAuction
}) => {
  const { address, account } = useAccount();
  const { fulfill: fulfillAuction, status: statusAuction } =
    useFulfillAuction();
  const { fulfillOffer, status } = useFulfillOffer();
  const isOwner = areAddressesEqual(token.owner, address);

  if (!account || !isOwner || !tokenMarketData?.has_offer) {
    return null;
  }

  const handleClick = async () => {
    try {
      if (isAuction) {
        await fulfillAuction({
          starknetAccount: account,
          brokerId: env.NEXT_PUBLIC_BROKER_ID,
          tokenAddress: token.contract_address,
          tokenId: token.token_id,
          orderHash: tokenMarketData.top_bid.order_hash,
          relatedOrderHash: tokenMarketData.order_hash
        });
      } else {
        await fulfillOffer({
          starknetAccount: account,
          brokerId: env.NEXT_PUBLIC_BROKER_ID,
          tokenAddress: token.contract_address,
          tokenId: token.token_id,
          orderHash: tokenMarketData.top_bid.order_hash
        });
      }
    } catch (error) {
      console.log("Error accepting offer");
    }
  };

  const isLoading = status === "loading" || statusAuction === "loading";

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <ReloadIcon className="animate-spin" />
      ) : (
        <>
          Accept offer
          <Separator orientation="vertical" className="mx-4" />
          {formatEther(BigInt(tokenMarketData?.top_bid?.amount))} ETH
        </>
      )}
    </Button>
  );
};

export default AcceptBestOffer;
