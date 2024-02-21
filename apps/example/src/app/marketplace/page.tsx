import { env } from "@/env";
import { Metadata } from "next";

import Explore from "./explore/components/explore";

const CURRENT_COLLECTION =
  "0x022411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436";
export const metadata: Metadata = {
  title: "Marketplace - examples",
  description: "Check out some examples app built using the Ark SDK hooks."
};

async function getData() {
  const response = await fetch(
    `${env.NEXT_PUBLIC_NFT_API_URL}/v1/tokens/0x22411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436`,
    {
      headers: {
        "x-api-key": env.NEXT_PUBLIC_NFT_API_KEY
      }
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

async function getMarketData() {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/tokens/collection/${CURRENT_COLLECTION}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

export default async function TaskPage() {
  const data = await getData();
  const orderBookData = await getMarketData();
  return <Explore initialData={data} orderbookData={orderBookData} />;
}
