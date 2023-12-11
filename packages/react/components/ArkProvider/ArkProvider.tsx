import React, { type PropsWithChildren } from "react";

import { RpcProviderProvider, RpcProviderProviderProps } from "./RpcContext";

function ArkProvider(props: PropsWithChildren<RpcProviderProviderProps>) {
  const { children, network } = props;

  return (
    <RpcProviderProvider network={network}>{children}</RpcProviderProvider>
  );
}

export { ArkProvider };
