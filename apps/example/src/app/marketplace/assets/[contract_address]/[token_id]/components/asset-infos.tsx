"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";

import { areAddressesEqual, truncateString } from "@/lib/utils";
import { TableCell, TableHead } from "@/components/ui/table";

const AssetInfos = ({ token }: { token: any }) => {
  const { address } = useAccount();
  const owner =
    address && areAddressesEqual(token.owner, address)
      ? "You"
      : truncateString(token.owner, 8);
  return (
    <div className="border rounded-md p-3">
      <table className="table-auto w-full">
        <thead>
          <tr className="uppercase text-sm">
            <TableHead className="w-[120px]">Price</TableHead>
            <TableHead>Last Sale</TableHead>
            <TableHead>Top Bid</TableHead>
            <TableHead>Collection Floor</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-right">ID</TableHead>
          </tr>
        </thead>
        <tbody>
          <tr className="text-sm">
            <TableCell className="font-medium">0.502 ETH</TableCell>
            <TableCell>0.58 ETH</TableCell>
            <TableCell>0.48 ETH</TableCell>
            <TableCell>0.473 ETH</TableCell>
            <TableCell>{owner}</TableCell>
            <TableCell className="text-right">{token.token_id}</TableCell>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AssetInfos;
