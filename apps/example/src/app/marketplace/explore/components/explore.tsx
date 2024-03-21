"use client";

import React from "react";

import { env } from "@/env";
import { useQuery } from "react-query";

import { mergeTokenData } from "../utils";
import { columns } from "./columns";
import { DataTable } from "./data-table";

const fetchCollection = async () => {
  const response = await fetch(
    `${env.NEXT_PUBLIC_NFT_API_URL}/v1/tokens/0x32d99485b22f2e58c8a0206d3b3bb259997ff0db70cffd25585d7dd9a5b0546`,
    {
      headers: {
        "x-api-key": env.NEXT_PUBLIC_NFT_API_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.json();
};

async function fetchCollectionMarket() {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/tokens/collection/0x32d99485b22f2e58c8a0206d3b3bb259997ff0db70cffd25585d7dd9a5b0546`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

const Explore = () => {
  const {
    data: collectionData,
    error: collectionDataError,
    isLoading: collectionDataIsLoading
  }: any = useQuery("tokens", fetchCollection);

  const {
    data: collectionMarketData,
    error: collectionMarketError,
    isLoading: collectionMarketIsLoading
  }: any = useQuery("collectionMarket", fetchCollectionMarket);

  if (collectionDataIsLoading || collectionMarketIsLoading) {
    return <div>Loading...</div>;
  }

  if (collectionDataError || collectionMarketError) {
    return (
      <div>
        Error missing data:{" "}
        {collectionDataError
          ? collectionDataError.message
          : collectionMarketError}
      </div>
    );
  }

  const tokenWithMarketData = mergeTokenData(
    collectionData.result,
    collectionMarketData
  );
  return <DataTable data={tokenWithMarketData} columns={columns} />;
};

export default Explore;
