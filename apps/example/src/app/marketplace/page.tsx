import { Metadata } from "next";

import Explore from "./explore/components/explore";

export const metadata: Metadata = {
  title: "Marketplace - examples",
  description: "Check out some examples app built using the Ark SDK hooks."
};

async function getData() {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/tokens/0x22411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436`,
    {
      headers: {
        "x-api-key": "AY1oXgEAmF139oBoxDSomzVnHqy8ZdQ2NxLmzJ6i"
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
    `http://127.0.0.1:8080/tokens/collection/0x022411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436`
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
