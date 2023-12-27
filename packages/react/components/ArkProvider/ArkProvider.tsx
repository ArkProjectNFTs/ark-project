import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useState
} from "react";

import { useAccount, useProvider } from "@starknet-react/core";
import { Contract, ProviderInterface } from "starknet";

import { argentAbi } from "../../abi/argentAbi";
import { braavosAbi } from "../../abi/braavosAbi";
import { RpcProviderProvider, RpcProviderProviderProps } from "./RpcContext";

const OwnerDataContext = createContext<string | undefined>(undefined);

const getOwner = async (
  address: string,
  provider: ProviderInterface,
  connectorId: string | undefined
) => {
  let owner = null;
  if (connectorId === "braavos") {
    const accountContract = new Contract(braavosAbi, address, provider);
    owner = await accountContract.call("get_public_key", [], {
      parseResponse: false
    });
  } else if (connectorId === "argentX") {
    const accountContract = new Contract(argentAbi, address, provider);
    owner = await accountContract.call("get_owner", [], {
      parseResponse: false
    });
  }
  return owner;
};

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
