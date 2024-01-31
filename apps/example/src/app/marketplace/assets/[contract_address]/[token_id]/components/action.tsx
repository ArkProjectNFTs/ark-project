"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";
import { SiEthereum } from "react-icons/si";

import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const Action = ({ token }: { token: any }) => {
  const { address } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);

  return (
    <div>
      <div>
        TODO: add this button if listing exists using the API
        {!isOwner && (
          <Button className="w-[200px]">
            <div className="flex w-full justify-between">
              <p className="uppercase font-bold">Buy Now</p>
              <div className="flex items-center space-x-1">
                0.999
                <SiEthereum />
              </div>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Action;
