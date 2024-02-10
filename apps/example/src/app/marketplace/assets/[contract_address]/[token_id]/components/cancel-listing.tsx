"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";

import { useCancel } from "@ark-project/react";

import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface CreateOfferProps {
  token: any;
  tokenMarketData: any;
}

const CancelListing: React.FC<CreateOfferProps> = ({
  token,
  tokenMarketData
}) => {
  const { cancel, status } = useCancel();
  const { account, address } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);
  if (
    account === undefined ||
    !isOwner ||
    !tokenMarketData ||
    !tokenMarketData.is_listed
  )
    return;
  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Cancel listing</h1>
      <Button
        onClick={() => {
          cancel({
            starknetAccount: account,
            orderHash: tokenMarketData.order_hash,
            tokenAddress: token.contract_address,
            tokenId: token.token_id
          });
        }}
      >
        Cancel listing
      </Button>
      {status === "loading" && "Cancelling..."}
      {status === "success" && "Cancelled"}
    </div>
  );
};

export default CancelListing;
