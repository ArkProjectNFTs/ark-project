import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useState
} from "react";

import { useAccount, useProvider } from "@starknet-react/core";

import { getOwner } from "../../lib/getOwner";
import { RpcProviderProvider, RpcProviderProviderProps } from "./RpcContext";

const OwnerDataContext = createContext<string | undefined>(undefined);

function ArkProvider(props: PropsWithChildren<RpcProviderProviderProps>) {
  const { children, network } = props;
  const [owner, setOwner] = useState<string | undefined>(undefined);

  const { address, connector } = useAccount();
  const { provider } = useProvider();
  useEffect(() => {
    const fetchOwner = async () => {
      if (address) {
        const owner = await getOwner(address, provider, connector?.id);
        if (Array.isArray(owner) && owner[0]) {
          setOwner(owner[0]);
        }
      } else {
        setOwner(undefined);
      }
    };

    fetchOwner();
  }, [address, provider]);

  return (
    <RpcProviderProvider network={network}>
      <OwnerDataContext.Provider value={owner}>
        {children}
      </OwnerDataContext.Provider>
    </RpcProviderProvider>
  );
}

export { ArkProvider, OwnerDataContext };
