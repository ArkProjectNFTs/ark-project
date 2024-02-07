// import { TokenMarketData } from "@/types";
import { env } from "@/env";

export async function getTokenData(contract_address: string, token_id: string) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_NFT_API_URL}/v1/tokens/${contract_address}/${token_id}`,
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

export async function getTokenMarketData({
  contract_address,
  token_id
}: {
  contract_address: string;
  token_id: string;
}) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/token/${contract_address}/${token_id}`
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getTokenOffers({
  contract_address,
  token_id
}: {
  contract_address: string;
  token_id: string;
}) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/token/${contract_address}/${token_id}/offers`
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getCollectionMetadata(contract_address: string) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_NFT_API_URL}/v1/contracts/${contract_address}`,
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
