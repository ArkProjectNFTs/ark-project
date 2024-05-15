import Web3 from "web3";

import CreateOffer from "./create-offer";

type BestOfferProps = {
  token: any;
  tokenMarketData: any;
  isOwner: boolean;
};

export function BestOffer({ token, tokenMarketData, isOwner }: BestOfferProps) {
  const price = tokenMarketData.top_bid.amount
    ? Web3.utils.fromWei(tokenMarketData.top_bid.amount, "ether")
    : "-";

  return (
    <div className="w-full border rounded p-4 flex flex-col space-y-4">
      <div className="">
        <div className="text-muted-foreground">Best offer</div>
        <div className="text-2xl font-bold">{price} ETH</div>
      </div>
      {isOwner || (
        <CreateOffer token={token} tokenMarketData={tokenMarketData} />
      )}
    </div>
  );
}

export default BestOffer;
