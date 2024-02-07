import React from "react";

import { env } from "@/env";
import { useQuery } from "react-query";
import { Web3 } from "web3";

import { timeSince, truncateString } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export async function getTokenActivity({
  contract_address,
  token_id
}: {
  contract_address: string;
  token_id: string;
}) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_ORDERBOOK_API_URL}/token/${contract_address}/${token_id}/history`
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

interface ActivityProps {
  params: any;
}

const Activity: React.FC<ActivityProps> = ({ params }) => {
  const { data, error, isLoading } = useQuery(
    "tokenActivityData",
    () =>
      getTokenActivity({
        contract_address: params.contract_address,
        token_id: params.token_id
      }),
    {}
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    throw error;
  }
  console.log("data", data);
  return (
    <div className="space-y-2">
      <div className="flex flex-col space-y-1.5 p-y-6 pt-4 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">
          Item activity
        </h3>
        <p className="text-sm text-muted-foreground">
          All the token events and transactions
        </p>
      </div>
      <div className="border rounded-md">
        {!data || !data.history || data.history.length === 0 ? (
          <div className="text-sm [&_p]:leading-relaxed text-center p-4">
            No activity available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data &&
                data.history &&
                data.history.map((activity: any) => (
                  <TableRow key={activity.event_timestamp}>
                    <TableCell>{activity.order_status}</TableCell>
                    <TableCell>
                      {activity.amount
                        ? `${Web3.utils.fromWei(activity.amount, "ether")} ETH`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {truncateString(activity.previous_owner, 8) || "-"}
                    </TableCell>
                    <TableCell>
                      {truncateString(activity.new_owner, 8) || "-"}
                    </TableCell>
                    <TableCell>{timeSince(activity.event_timestamp)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Activity;
