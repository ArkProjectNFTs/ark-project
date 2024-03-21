import React from "react";

import { useAccount } from "@starknet-react/core";
import { useQuery } from "react-query";
import { Web3 } from "web3";

import { useFulfillOffer } from "@ark-project/react";

import {
  areAddressesEqual,
  getRoundedRemainingTime,
  truncateString
} from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { getTokenOffers } from "../data";

interface TokenOffersProps {
  token: any;
}

const TokenOffers: React.FC<TokenOffersProps> = ({ token }) => {
  const {
    data: tokenOffers,
    error: tokenOffersError,
    isLoading: tokenOffersIsLoading
  }: any = useQuery(
    "tokenOffers",
    () =>
      getTokenOffers({
        contract_address: token.contract_address,
        token_id: token.token_id
      }),
    {
      refetchInterval: 10000
    }
  );

  const { address, account } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);
  const { fulfillOffer } = useFulfillOffer();
  if (account === undefined) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col space-y-1.5 p-y-6 pt-4 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">Offers</h3>
        <p className="text-sm text-muted-foreground">
          View and accept offers for this item
        </p>
      </div>
      <div className="border rounded-md">
        {tokenOffersError ||
        !tokenOffers ||
        !tokenOffers.offers ||
        tokenOffers.offers.length === 0 ? (
          <div className="text-sm [&_p]:leading-relaxed text-center p-4">
            No offers available
          </div>
        ) : (
          <>
            {tokenOffersIsLoading ? (
              <div className="text-sm [&_p]:leading-relaxed text-center p-4">
                Loading...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>From</TableHead>
                    {isOwner && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenOffers.offers.map((offer: any) => (
                    <TableRow className="group" key={offer.order_hash}>
                      <TableCell>
                        {`${Web3.utils.fromWei(
                          offer.offer_amount,
                          "ether"
                        )} ETH`}
                      </TableCell>
                      <TableCell>
                        {Web3.utils
                          .hexToNumber(offer.offer_quantity)
                          .toString()}
                      </TableCell>
                      <TableCell>
                        in {getRoundedRemainingTime(offer.end_date)}
                      </TableCell>
                      <TableCell>
                        {truncateString(offer.offer_maker, 8)}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <Button
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              fulfillOffer({
                                starknetAccount: account,
                                brokerId: 1, // to change to your broker id
                                tokenAddress: token.contract_address,
                                tokenId: token.token_id,
                                orderHash: offer.order_hash
                              });
                            }}
                          >
                            Accept Offer
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TokenOffers;
