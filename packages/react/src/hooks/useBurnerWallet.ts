// useBurnerWallet.js
import { useEffect, useState } from "react";

import { Account } from "starknet";

import { useArkRpc } from "./useArkRpc";

function useBurnerWallet() {
  const { rpcProvider } = useArkRpc();
  const [arkAccount, setArkAccount] = useState<Account | null>(null);

  useEffect(() => {
    const burner_address =
      "0x29873c310fbefde666dc32a1554fea6bb45eecc84f680f8a2b0a8fbb8cb89af";
    const burner_private_key =
      "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912";

    const account = new Account(
      rpcProvider,
      burner_address,
      burner_private_key
    );
    setArkAccount(account);
  }, [rpcProvider]);

  return arkAccount;
}

export { useBurnerWallet };
