import Asset from "./components/asset";
import {
  getCollectionMetadata,
  getTokenData,
  getTokenMarketData,
  getTokenOffers
} from "./data";

export default async function Token({
  params
}: {
  params: { contract_address: string; token_id: string };
}) {
  const { result: token } = await getTokenData(
    params.contract_address,
    params.token_id
  );

  const { result: collection } = await getCollectionMetadata(
    params.contract_address
  );

  const tokenMarketData = await getTokenMarketData({
    contract_address: params.contract_address,
    token_id: params.token_id
  });

  const tokenOffers = await getTokenOffers({
    contract_address: params.contract_address,
    token_id: params.token_id
  });

  return (
    <Asset
      params={params}
      token={token}
      collection={collection}
      tokenMarketData={tokenMarketData}
      tokenOffers={tokenOffers}
    />
  );
}