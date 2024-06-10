"use client";

import React from "react";

import { TokenMarketData } from "@/types";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";

import { useCancel } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface CancelListingProps {
  token: Token;
  tokenMarketData: TokenMarketData;
}

const CancelListing: React.FC<CancelListingProps> = ({
  token,
  tokenMarketData
}) => {
  const { account, address } = useAccount();
  const { cancel, status } = useCancel();
  const isOwner = areAddressesEqual(token.owner, address);

  if (!account || !isOwner || !tokenMarketData?.is_listed) {
    return;
  }

  const handleClick = async () => {
    await cancel({
      starknetAccount: account,
      orderHash: BigInt(tokenMarketData.order_hash),
      tokenAddress: token.contract_address,
      tokenId: BigInt(token.token_id)
    });
  };

  const isDisabled = ["loading", "cancelling"].includes(status);

  return (
    <Button onClick={handleClick} disabled={isDisabled}>
      {status === "loading" ? (
        <ReloadIcon className="animate-spin" />
      ) : (
        "Cancel listing"
      )}
    </Button>
  );
};

export default CancelListing;
