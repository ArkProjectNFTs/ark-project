import { TokenMarketData } from "@/types";
import { formatEther } from "viem";

import { Token } from "@/types/schema";

import CreateOffer from "./create-offer";

type BestOfferProps = {
  token: Token;
  tokenMarketData: TokenMarketData;
  isOwner: boolean;
};

export function BestOffer({ token, tokenMarketData, isOwner }: BestOfferProps) {
  return (
    <div className="w-full border rounded p-4 flex flex-col space-y-4">
      <div className="">
        <div className="text-muted-foreground">Best offer</div>
        <div className="text-2xl font-bold">
          {tokenMarketData?.top_bid.amount
            ? formatEther(BigInt(tokenMarketData.top_bid.amount))
            : "-"}{" "}
          ETH
        </div>
      </div>
      {isOwner || (
        <CreateOffer token={token} tokenMarketData={tokenMarketData} />
      )}
    </div>
  );
}

export default BestOffer;
