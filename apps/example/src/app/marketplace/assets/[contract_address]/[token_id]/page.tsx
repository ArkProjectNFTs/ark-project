import Asset from "./components/asset";
import { getCollectionMetadata } from "./data";

export default async function Token({
  params
}: {
  params: { contract_address: string; token_id: string };
}) {
  const { result: collection } = await getCollectionMetadata(
    params.contract_address
  );

  return <Asset params={params} collection={collection} />;
}
