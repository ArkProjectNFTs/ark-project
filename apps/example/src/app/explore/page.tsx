import Link from "next/link";

import Media from "@/components/media";

async function getData() {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/tokens/0x05796ca7d7c1eec6ff70b34a15806b91634cda4b8a833e0a7802dcbcbc0c7ced`,
    {
      headers: {
        "x-api-key": "AY1oXgEAmF139oBoxDSomzVnHqy8ZdQ2NxLmzJ6i"
      }
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

export default async function Assets() {
  const { result } = await getData();
  return (
    <div className="flex flex-col items-left space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Everai Test collection page
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {result.map((token: any, index: number) => (
          <Link
            href={`/assets/${token.contract_address}/${token.token_id}`}
            key={index}
          >
            <div className="border rounded-md cursor-pointer p-2">
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
                    Contract Address {token.contract_address}
                  </p>
                  <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden">
                    Token ID: {token.token_id}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
