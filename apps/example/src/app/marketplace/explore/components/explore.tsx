"use client";

import React from "react";

import { env } from "@/env";
import { useQuery } from "react-query";

import { mergeTokenData } from "../utils";
import { columns } from "./columns";
import { DataTable } from "./data-table";

const fetchCollection = async () => {
  const response = await fetch(
    `${env.NEXT_PUBLIC_NFT_API_URL}/v1/tokens/0x22411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436`,
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

async function fetchCollectionOrders() {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/tokens/collection/0x022411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

const Explore = ({ initialData = [], orderBookData = [] }: any) => {
  const { data, error, isLoading }: any = useQuery("tokens", fetchCollection, {
    initialData
    // refetchInterval: 1000
  });

  const {
    data: collectionOrdersData,
    error: collectionOrdersError,
    isLoading: collectionOrdersIsLoading
  }: any = useQuery("collectionOrders", fetchCollectionOrders, {
    initialData: orderBookData
    // refetchInterval: 1000
  });

  if (isLoading || collectionOrdersIsLoading) {
    return <div>Loading...</div>;
  }
  if (error || collectionOrdersError) {
    return (
      <div>
        Error missing data: {error ? error.message : collectionOrdersError}
      </div>
    );
  }

  const tokenWithMarketData = mergeTokenData(data.result, collectionOrdersData);
  return <DataTable data={tokenWithMarketData} columns={columns} />;
};

export default Explore;
