import { TokenMarketData } from "@/types";

export async function getTokenData(contract_address: string, token_id: string) {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/tokens/${contract_address}/${token_id}`,
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

export async function getTokenMarketData({
  contract_address,
  token_id
}: {
  contract_address: string;
  token_id: string;
}) {
  const response = await fetch(
    `http://127.0.0.1:8080/token/${contract_address}/${token_id}`
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
    `http://127.0.0.1:8080/token/${contract_address}/${token_id}/offers`
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getCollectionMetadata(contract_address: string) {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/contracts/${contract_address}`,
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
