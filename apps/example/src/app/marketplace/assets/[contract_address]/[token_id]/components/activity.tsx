import React from "react";

import { useQuery } from "react-query";

export async function getTokenActivity({
  contract_address,
  token_id
}: {
  contract_address: string;
  token_id: string;
}) {
  const response = await fetch(
    `http://127.0.0.1:8080/token/${contract_address}/${token_id}/history`
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
  const { data, error, isLoading }: any = useQuery(
    "tokenMarketData",
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
    return <div>Error: {error}</div>;
  }

  return (
    <div className="border rounded-md p-3">
      <div>Activity</div>
      <div>
        {data &&
          data.history &&
          data.history.length > 0 &&
          data.history.map((activity: any) => (
            <div key={activity.event_timestamp}>
              {activity.event_type} - {activity.event_timestamp}
              {activity.amount ? ` - ${activity.amount}` : ""}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Activity;
