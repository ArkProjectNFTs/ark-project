"use client";

import React from "react";

import { TokenMarketData } from "@/types";
import { ClockIcon } from "@radix-ui/react-icons";
import moment from "moment";
import Web3 from "web3";

import { useOrderType } from "@ark-project/react";

import { Token } from "@/types/schema";

import AcceptOffer from "./accept-best-offer";
import FulfillListing from "./buy-now";
import CancelListing from "./cancel-listing";
import CreateBid from "./create-bid";
import CreateOffer from "./create-offer";

interface ListingProps {
  token: Token;
  tokenMarketData: TokenMarketData;
  isOwner: boolean;
}

const Listing: React.FC<ListingProps> = ({ token, tokenMarketData }) => {
  const orderType = useOrderType({
    orderHash: tokenMarketData.order_hash
  });
  const price = Web3.utils.fromWei(tokenMarketData.start_amount, "ether");
  const reservePrice = Web3.utils.fromWei(tokenMarketData.end_amount, "ether");

  if (!orderType) {
    return null;
  }

  const isAuction = orderType === "AUCTION";

  return (
    <div className="w-full border rounded">
      <div className="flex space-x-2 border-b p-4 items-center">
        <ClockIcon className="w-6 h-6" />
        <div className="">
          Sale ends {moment.unix(tokenMarketData.end_date).format("LLLL")}
        </div>
        <div className="grow" />
        <CancelListing token={token} tokenMarketData={tokenMarketData} />
      </div>
      <div className="p-4">
        {isAuction ? (
          <>
            <div className="text-muted-foreground">Minimum bid {price} ETH</div>
            <div className="text-muted-foreground mb-2">
              Reserve bid {reservePrice} ETH
            </div>
            <CreateBid token={token} tokenMarketData={tokenMarketData} />
          </>
        ) : (
          <>
            <div className="text-muted-foreground">Current Price</div>
            <div className="text-3xl font-bold mb-4">{price} ETH</div>
            <AcceptOffer token={token} tokenMarketData={tokenMarketData} />
            <div className="flex space-x-2">
              <FulfillListing token={token} tokenMarketData={tokenMarketData} />
              <CreateOffer token={token} tokenMarketData={tokenMarketData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Listing;
