// useBurnerWallet.js
import { useEffect, useState } from "react";

import { Account } from "starknet";

import { useArkRpc } from "./useArkRpc";

function useBurnerWallet() {
  const { rpcProvider } = useArkRpc();
  const [arkAccount, setArkAccount] = useState<Account | null>(null);

  useEffect(() => {
    const burner_address = localStorage.getItem("burner_address");
    const burner_private_key = localStorage.getItem("burner_private_key");

    if (burner_address && burner_private_key) {
      const account = new Account(
        rpcProvider,
        burner_address,
        burner_private_key
      );
      setArkAccount(account);
    }
  }, [rpcProvider]);

  return arkAccount;
}

export { useBurnerWallet };
