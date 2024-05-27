import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {},
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_ORDERBOOK_API_URL: z.string(),
    NEXT_PUBLIC_NFT_API_URL: z.string(),
    NEXT_PUBLIC_NFT_API_KEY: z.string(),
    NEXT_PUBLIC_BROKER_ID: z.string(),
    NEXT_PUBLIC_ARKCHAIN_ORDERBOOK_CONTRACT: z.string(),
    NEXT_PUBLIC_STARKNET_MESSAGING_CONTRACT: z.string(),
    NEXT_PUBLIC_STARKNET_ETH_CONTRACT: z.string(),
    NEXT_PUBLIC_STARKNET_NFT_CONTRACT: z.string()
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    NEXT_PUBLIC_NFT_API_KEY: process.env.NEXT_PUBLIC_NFT_API_KEY,
    NEXT_PUBLIC_ORDERBOOK_API_URL: process.env.NEXT_PUBLIC_ORDERBOOK_API_URL,
    NEXT_PUBLIC_NFT_API_URL: process.env.NEXT_PUBLIC_NFT_API_URL,
    NEXT_PUBLIC_BROKER_ID: process.env.NEXT_PUBLIC_BROKER_ID,
    NEXT_PUBLIC_ARKCHAIN_ORDERBOOK_CONTRACT:
      process.env.NEXT_PUBLIC_ARKCHAIN_ORDERBOOK_CONTRACT,
    NEXT_PUBLIC_STARKNET_MESSAGING_CONTRACT:
      process.env.NEXT_PUBLIC_STARKNET_MESSAGING_CONTRACT,
    NEXT_PUBLIC_STARKNET_ETH_CONTRACT:
      process.env.NEXT_PUBLIC_STARKNET_ETH_CONTRACT,
    NEXT_PUBLIC_STARKNET_NFT_CONTRACT:
      process.env.NEXT_PUBLIC_STARKNET_NFT_CONTRACT
  }
});
