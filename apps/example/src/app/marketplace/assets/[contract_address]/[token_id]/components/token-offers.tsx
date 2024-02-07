import React from "react";

import { Web3 } from "web3";

import { getRoundedRemainingTime, truncateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface TokenOffersProps {
  tokenOffers: any;
}

const TokenOffers: React.FC<TokenOffersProps> = ({ tokenOffers }) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-col space-y-1.5 p-y-6 pt-4 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">Offers</h3>
        <p className="text-sm text-muted-foreground">
          View and accept offers for this item
        </p>
      </div>
      <div className="border rounded-md">
        {!tokenOffers ||
        !tokenOffers.offers ||
        tokenOffers.offers.length === 0 ? (
          <div className="text-sm [&_p]:leading-relaxed text-center p-4">
            No offers available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Floor Difference</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>From</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenOffers.offers.map((offer: any) => (
                <TableRow className="group" key={offer.order_hash}>
                  <TableCell>
                    {`${Web3.utils.fromWei(offer.offer_amount, "ether")} ETH`}
                  </TableCell>
                  <TableCell>
                    {Web3.utils.hexToNumber(offer.offer_quantity).toString()}
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    in {getRoundedRemainingTime(offer.end_date)}
                  </TableCell>
                  <TableCell>{truncateString(offer.offer_maker, 8)}</TableCell>
                  <TableCell>
                    <Button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Accept Offer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default TokenOffers;
