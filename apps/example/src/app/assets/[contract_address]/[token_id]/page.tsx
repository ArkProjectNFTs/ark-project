import Link from "next/link";

import { cn } from "@/lib/utils";
import { Announcement } from "@/components/announcement";
import Media from "@/components/media";
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading
} from "@/components/page-header";
import { buttonVariants } from "@/components/ui/Button";

import CreateListing from "../../../examples/components/CreateListing";

async function getData(contract_address: string, token_id: string) {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/tokens/${contract_address}/${token_id}`,
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

export default async function Token({
  params
}: {
  params: { contract_address: string; token_id: string };
}) {
  const { result: token } = await getData(
    params.contract_address,
    params.token_id
  );

  return (
    <div className="container relative">
      <PageHeader>
        <Announcement />
        <PageHeaderHeading className="hidden md:block">
          Check out some examples
        </PageHeaderHeading>
        <PageHeaderHeading className="md:hidden">Examples</PageHeaderHeading>
        <PageHeaderDescription>
          Dashboard, cards, authentication. Some examples built using the
          components. Use this as a guide to build your own.
        </PageHeaderDescription>
        <PageActions>
          <Link href="/docs" className={cn(buttonVariants(), "rounded-[6px]")}>
            Get Started
          </Link>
          <Link
            href="/components"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-[6px]"
            )}
          >
            Components
          </Link>
        </PageActions>
      </PageHeader>
      <div className="grid grid-rows-3 grid-flow-col gap-4">
        <div className="row-span-3 col-span-1 ...">
          <div className="flex flex-col items-left space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              {token.metadata && token.metadata.normalized
                ? token.metadata.normalized.name
                : token.token_id}
            </h2>
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
                  <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden">
                    Contract Address {token.contract_address}
                  </p>
                  <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden">
                    Token ID: {token.token_id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row-span-3 col-span-2 ...">buy / sell</div>
      </div>
    </div>
  );
}
