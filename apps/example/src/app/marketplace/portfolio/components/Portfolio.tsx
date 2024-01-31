import React, { useEffect, useState } from "react";

import { useAccount } from "@starknet-react/core";
import Link from "next/link";

import Media from "@/components/media";

const Portfolio: React.FC = () => {
  const [tokens, setTokens] = useState([]);
  const { address } = useAccount();
  useEffect(() => {
    const fetchData = async () => {
      if (!address) {
        return;
      }
      try {
        const response = await fetch(
          `https://testnet-api.arkproject.dev/v1/owners/${address}/tokens`,
          {
            headers: {
              "x-api-key": "AY1oXgEAmF139oBoxDSomzVnHqy8ZdQ2NxLmzJ6i"
            }
          }
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setTokens(data.result);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
    fetchData();
  }, [address]);

  return (
    <div className="grid grid-cols-6 gap-4">
      {tokens.map((token: any, index) => (
        <Link
          href={`/marketplace/assets/${token.contract_address}/${token.token_id}`}
          key={index}
        >
          <div className="border rounded-md cursor-pointer hover:border-slate-400 hover:shadow-md p-2">
            <div className="flex flex-col space-y-2">
              <div className="overflow-hidden rounded-md">
                {token.metadata &&
                token.metadata.normalized &&
                token.metadata.normalized.image ? (
                  <Media
                    url={token.metadata.normalized.image}
                    name={token.token_id || "Token Image"}
                  />
                ) : (
                  <Media
                    url="/missing.jpg"
                    name={token.token_id || "Token Image"}
                  />
                )}
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-medium leading-none">
                  {token.metadata && token.metadata.normalized
                    ? token.metadata.normalized.name
                    : token.token_id}
                </h3>
                <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden">
                  {token.contract_address}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Portfolio;
