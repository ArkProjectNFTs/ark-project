import Image from "next/image";
import Link from "next/link";
import { RiTwitterXLine } from "react-icons/ri";

import Media from "@/components/media";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

import Action from "./components/action";
import AssetsInfos from "./components/asset-infos";
import CreateListing from "./components/create-listing";
import CreateOffer from "./components/create-offer";

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

// TODO use that later to get data from API
// async function getCollectionMetadata(contract_address: string) {
//   const response = await fetch(
//     `https://testnet-api.arkproject.dev/v1/contracts/${contract_address}`,
//     {
//       headers: {
//         "x-api-key": "AY1oXgEAmF139oBoxDSomzVnHqy8ZdQ2NxLmzJ6i"
//       }
//     }
//   );
//   if (!response.ok) {
//     throw new Error("Failed to fetch data");
//   }
//   return response.json();
// }

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
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-rows-3 grid-cols-3 gap-6 h-[700px]">
        <div className="row-span-3 col-span-1 flex space-y-5 flex-col">
          <div className="flex space-y-2 flex-col">
            <h1 className="text-2xl font-bold uppercase">
              Everai #{token.token_id}
            </h1>
            <div className="flex justify-between">
              <Link href="/marketplace/explore" target="_blank">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/everai.jpg"
                    width="30"
                    height="30"
                    alt="everai"
                    className="rounded-full"
                  />
                  <h1 className="text-sm text-slate-300">Everai</h1>
                </div>
              </Link>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="https://twitter.com/Everai" target="_blank">
                      <Button variant="ghost" size="icon">
                        <RiTwitterXLine />
                        <span className="sr-only">Archive</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Twitter</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-md relative">
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
          <Action token={token} />
        </div>
        <div className="row-span-3 col-span-2 space-y-4">
          <AssetsInfos token={token} />
          <CreateListing token={token} />
          <CreateOffer token={token} />
        </div>
      </div>
    </TooltipProvider>
  );
}
