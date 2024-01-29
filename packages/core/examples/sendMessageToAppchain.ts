import { Account, Call, CallData, ProviderInterface } from "starknet";

import "dotenv/config";

import { fetchOrCreateAccount } from "../src";
import { config } from "./config";

export async function executeMessageFromAppchain(
  provider: ProviderInterface,
  starknetAccount: Account
) {
  const { abi } = await provider.getClassAt(
    "0x7f49a8865329feedb82331398696a9464f8b04cca5949efddef345703616b1c"
  );
  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const executeCall: Call = {
    contractAddress:
      "0x7f49a8865329feedb82331398696a9464f8b04cca5949efddef345703616b1c",
    entrypoint: "execute_message_from_appchain",
    calldata: CallData.compile({
      from_address:
        "0x2d7a52cfee677879296f51ff2fe2970c5e7762062f94a04fd84fac274e38f5c",
      to_address:
        "0x7d026f59019e5cf8772d613f6ea989793627d8027e502878b5be25209c8dcd",
      selector:
        "0x3a6afa2f4a63b70a33b207f6d0ffd85215ac2c462c9bfe30f6f0eca510e5250",
      payload: [
        "0xbced57c1c2cd2896660865c6ec213f4d7cb6fd7f955fc4dee601b179730e3d",
        "0x22411b480425fe6e627fdf4d1b6ac7f8567314ada5617a0a6d8ef3e74b69436",
        "0x685c0de1672414a4445160a8be2cf6559f451edc0d69e42f971772eab5d4af6",
        "0x2a105cc51314d4021a1d6e2e5d15dd5ef8a79a1378f7bfae63010d74e4afc53",
        "0x5",
        "0x0",
        "0x2a105cc51314d4021a1d6e2e5d15dd5ef8a79a1378f7bfae63010d74e4afc53",
        "0x685c0de1672414a4445160a8be2cf6559f451edc0d69e42f971772eab5d4af6",
        "0x16345785d8a0000",
        "0x0",
        "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        "0x534e5f474f45524c49"
      ]
    })
  };

  const result = await starknetAccount.execute(executeCall, [abi]);
  console.log("result: ", result);
  await provider.waitForTransaction(result.transaction_hash);
}

(async () => {
  console.log(`=> Getting config...`);
  const { starknetProvider } = config;
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    "0x05ed5822d2bc13c279362b01fd661c63dd64fd7558c31a89c0f078edf74fce3c",
    "0x4fec648f37c92cf255dd47ea0d5e5078ba01742dc97ae13a91d10521e09ca6d"
  );

  executeMessageFromAppchain(starknetProvider, starknetOffererAccount);
})();
