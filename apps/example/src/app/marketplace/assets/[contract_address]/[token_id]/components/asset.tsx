"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";
import Image from "next/image";
import Link from "next/link";
import { RiTwitterXLine } from "react-icons/ri";
import { SiOpensea } from "react-icons/si";
import { useQuery } from "react-query";

import { areAddressesEqual } from "@/lib/utils";

import { getTokenData, getTokenMarketData } from "../data";
import AssetsInfos from "./asset-infos";
import BestOffer from "./best-offer";
import CreateListing from "./create-listing";
import Listing from "./listing";
import Activity from "./token-activity";
import TokenMedia from "./token-media";
import TokenOffers from "./token-offers";

interface AssetProps {
  collection: any;
  params: any;
}

const Asset: React.FC<AssetProps> = ({ params }) => {
  const { address } = useAccount();
  const { data: tokenMarketData }: any = useQuery(
    "tokenMarketData",
    () =>
      getTokenMarketData({
        contract_address: params.contract_address,
        token_id: params.token_id
      }),
    {
      refetchInterval: 10000
    }
  );

  const {
    data: tokenData,
    isLoading,
    error
  }: any = useQuery(
    "tokenMetadata",
    () => getTokenData(params.contract_address, params.token_id),
    {
      refetchInterval: 10000
    }
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const token = tokenData.result;
  const isOwner = areAddressesEqual(token.owner, address);

  return (
    <div className="grid grid-rows-3 grid-cols-3 gap-6 min-h-[700px]">
      <div className="row-span-3 col-span-1 flex space-y-5 flex-col">
        <div className="flex space-y-2 flex-col">
          <div className="text-xl font-bold">Duo #{token.token_id}</div>
          <div className="flex justify-between">
            <Link href="/marketplace/explore" target="_blank">
              <div className="flex items-center space-x-2">
                <Image
                  src="/everai.jpg"
                  width="24"
                  height="24"
                  alt="everai"
                  className="rounded-full"
                />
                <h1 className="text-sm">EveraiDuo</h1>
              </div>
            </Link>
            <div className="flex space-x-2">
              <Link href="https://twitter.com/Everai" target="_blank">
                <SiOpensea className="w-6 h-6" />
              </Link>
              <Link
                href="https://twitter.com/Everai"
                target="_blank"
                className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center"
              >
                <RiTwitterXLine className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-md">
          <TokenMedia token={token} />
        </div>
      </div>
      <div className="row-span-3 col-span-2 space-y-4">
        <AssetsInfos token={token} tokenMarketData={tokenMarketData} />
        {tokenMarketData?.is_listed ? (
          <Listing
            token={token}
            tokenMarketData={tokenMarketData}
            isOwner={isOwner}
          />
        ) : (
          <>
            <BestOffer
              token={token}
              tokenMarketData={tokenMarketData}
              isOwner={isOwner}
            />
            {isOwner && (
              <>
                <CreateListing
                  token={token}
                  tokenMarketData={tokenMarketData}
                />
              </>
            )}
          </>
        )}
        <TokenOffers token={token} />
        <Activity params={params} />
      </div>
    </div>
  );
};

export default Asset;
