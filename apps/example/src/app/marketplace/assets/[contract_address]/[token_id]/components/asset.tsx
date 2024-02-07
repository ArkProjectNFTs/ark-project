"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";
import { RiTwitterXLine } from "react-icons/ri";
import { useQuery } from "react-query";

import Media from "@/components/media";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

import { getTokenMarketData, getTokenOffers } from "../data";
import AssetsInfos from "./asset-infos";
import CancelListing from "./cancel-listing";
import CreateListing from "./create-listing";
import CreateOffer from "./create-offer";
import FulfillListing from "./fulfill-listing";
import FulFillOffer from "./fulfill-offer";
import Activity from "./token-activity";
import TokenOffers from "./token-offers";

interface AssetProps {
  token: any;
  collection: any;
  tokenMarketData: any;
  tokenOffers: any;
  params: any;
}

const Asset: React.FC<AssetProps> = ({
  params,
  token,
  collection,
  tokenMarketData: tokenMarketInitialData,
  tokenOffers: tokenOffersInitialData
}) => {
  const {
    data: tokenMarketData,
    error: tokenMarketDataError,
    isLoading: tokenMarketDataIsLoading
  }: any = useQuery(
    "tokenMarketData",
    () =>
      getTokenMarketData({
        contract_address: params.contract_address,
        token_id: params.token_id
      }),
    {
      initialData: tokenMarketInitialData
    }
  );

  const {
    data: tokenOffersData,
    error: tokenOffersError,
    isLoading: tokenOffersIsLoading
  }: any = useQuery(
    "tokenOffers",
    () =>
      getTokenOffers({
        contract_address: params.contract_address,
        token_id: params.token_id
      }),
    {
      initialData: tokenOffersInitialData
    }
  );
  console.log(tokenMarketData, "tokenMarketData");
  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-rows-3 grid-cols-3 gap-6 min-h-[700px]">
        <div className="row-span-3 col-span-1 flex space-y-5 flex-col">
          <div className="flex space-y-2 flex-col">
            <h1 className="text-2xl font-bold uppercase">
              {collection.name} #{token.token_id}
            </h1>
            <div className="flex justify-between">
              <Link href="/marketplace/explore" target="_blank">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/everai.jpg"
                    width="30"
                    height="30"
                    alt="everai"
                    className="rounded-full"
                  />
                  <h1 className="text-sm text-slate-300">{collection.name}</h1>
                </div>
              </Link>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="https://twitter.com/Everai" target="_blank">
                      <Button variant="ghost" size="icon">
                        <RiTwitterXLine />
                        <span className="sr-only">Archive</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Twitter</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-md relative">
            {token.metadata &&
            token.metadata.normalized &&
            token.metadata.normalized.image ? (
              <Media
                url={token.metadata.normalized.image}
                name={token.token_id || "Token Image"}
              />
            ) : (
              <Media
                url="/missing.jpg"
                name={token.token_id || "Token Image"}
              />
            )}
          </div>
          {tokenMarketData && (
            <FulfillListing token={token} tokenMarketData={tokenMarketData} />
          )}
          {tokenMarketData && (
            <FulFillOffer
              tokenMarketData={tokenMarketData}
              token={token}
              tokenOffers={tokenOffersData}
            />
          )}
          {tokenMarketData && (
            <CancelListing
              token={token}
              tokenMarketData={tokenMarketData || undefined}
            />
          )}
        </div>
        <div className="row-span-3 col-span-2 space-y-4">
          <AssetsInfos
            token={token}
            tokenMarketData={tokenMarketData || undefined}
          />
          <CreateListing
            token={token}
            tokenMarketData={tokenMarketData || undefined}
          />
          <CreateOffer
            token={token}
            tokenMarketData={tokenMarketData || undefined}
          />
          <TokenOffers tokenOffers={tokenOffersData} />
          <Activity params={params} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Asset;
