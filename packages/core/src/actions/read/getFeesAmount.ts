import { cairo, CallData, Contract } from "starknet";

import { Config } from "../../createConfig.js";

interface GetFeesAmountParameters {
  fulfillBroker: string;
  listingBroker: string;
  nftAddress: string;
  nftTokenId: bigint;
  paymentAmount: bigint;
}

export async function getFeesAmount(
  config: Config,
  parameters: GetFeesAmountParameters
) {
  const { abi } = await config.starknetProvider.getClassAt(
    config.starknetExecutorContract
  );

  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const contract = new Contract(
    abi,
    config.starknetExecutorContract,
    config.starknetProvider
  );
  const callData = CallData.compile({
    fulfill_broker: parameters.fulfillBroker,
    listing_broker: parameters.listingBroker,
    nft_address: parameters.nftAddress,
    nft_token_id: cairo.uint256(parameters.nftTokenId),
    payment_amount: cairo.uint256(BigInt(100000000))
  });
  const fees = await contract.get_fees_amount(callData);

  return {
    ark: fees.ark as bigint,
    creator: fees.creator as bigint,
    fulfillBroker: fees.fulfill_broker as bigint,
    listingBroker: fees.listing_broker as bigint
  };
}
