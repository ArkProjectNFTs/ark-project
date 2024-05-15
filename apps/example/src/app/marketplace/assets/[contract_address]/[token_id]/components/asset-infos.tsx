"use client";

import React from "react";

import { TokenMarketData } from "@/types";
import { useAccount } from "@starknet-react/core";
import { SiEthereum } from "react-icons/si";
import { Web3 } from "web3";

import { Token } from "@/types/schema";
import { areAddressesEqual, shortAddress } from "@/lib/utils";
import { TableCell, TableHead } from "@/components/ui/table";

interface AssetInfosProps {
  token: Token;
  tokenMarketData?: TokenMarketData;
}

const AssetInfos: React.FC<AssetInfosProps> = ({ token, tokenMarketData }) => {
  const { address } = useAccount();
  const owner = areAddressesEqual(token.owner, address)
    ? "You"
    : shortAddress(token.owner);

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
            <TableCell className="font-medium">
              {tokenMarketData && tokenMarketData.start_amount ? (
                <div className="flex space-x-2 items-center">
                  {Web3.utils.fromWei(tokenMarketData.start_amount, "ether")}
                  <SiEthereum />
                </div>
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell>
              {" "}
              {tokenMarketData && tokenMarketData.last_price
                ? `${Web3.utils.fromWei(
                    tokenMarketData.last_price,
                    "ether"
                  )}  ETH`
                : "-"}
            </TableCell>
            <TableCell>
              {tokenMarketData?.top_bid?.amount
                ? `${Web3.utils.fromWei(
                    tokenMarketData?.top_bid?.amount,
                    "ether"
                  )}  ETH`
                : "-"}
            </TableCell>
            <TableCell>-</TableCell>
            <TableCell>{owner}</TableCell>
            <TableCell className="text-right">{token.token_id}</TableCell>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AssetInfos;
