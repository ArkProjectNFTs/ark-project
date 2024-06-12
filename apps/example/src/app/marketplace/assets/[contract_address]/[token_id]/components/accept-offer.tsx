"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";

import { useFulfillAuction, useFulfillOffer } from "@ark-project/react";
import { FulfillAuctionParameters } from "@ark-project/react/dist/types/src/hooks/useFulfillAuction";

import { Offer, Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface AcceptOfferProps {
  token: Token;
  tokenMarketData: TokenMarketData;
  offer: Offer;
  isAuction: boolean;
}

const AcceptOffer: React.FC<AcceptOfferProps> = ({
  token,
  tokenMarketData,
  offer,
  isAuction
}) => {
  const { address, account } = useAccount();

  const { fulfillOffer, status } = useFulfillOffer();
  const { fulfill: fulfillAuction, status: statusAuction } =
    useFulfillAuction();
  const isOwner = areAddressesEqual(token.owner, address);
  const isListed = tokenMarketData?.is_listed;

  if (!account || !isOwner) {
    return null;
  }

  const handleClick = async () => {
    console.log("isAuction", isAuction, tokenMarketData, offer);

    if (isListed && isAuction) {
      await fulfillAuction({
        starknetAccount: account,
        brokerId: env.NEXT_PUBLIC_BROKER_ID,
        tokenAddress: token.contract_address,
        tokenId: token.token_id,
        orderHash: tokenMarketData.order_hash,
        relatedOrderHash: offer.order_hash,
        startAmount: offer.offer_amount
      });
    } else {
      await fulfillOffer({
        starknetAccount: account,
        brokerId: env.NEXT_PUBLIC_BROKER_ID,
        tokenAddress: token.contract_address,
        tokenId: token.token_id,
        orderHash: offer.order_hash
      });
    }
  };

  const isDisabled = status === "loading";
  const isLoading = ["loading", "cancelling"].includes(status);

  return (
    <Button onClick={handleClick} disabled={isDisabled} size="sm">
      {isLoading ? <ReloadIcon className="animate-spin" /> : "Accept"}
    </Button>
  );
};

export default AcceptOffer;
