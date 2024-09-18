import React from "react";

import { devnet, mainnet } from "@starknet-react/chains";
import {
  jsonRpcProvider,
  MockConnectorOptions,
  StarknetConfig as OgStarknetConfig
} from "@starknet-react/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  RenderHookOptions,
  RenderOptions,
  RenderResult
} from "@testing-library/react";

import { config, defaultConnector } from "@ark-project/test";

import { ArkProvider } from "../src/components/ArkProvider";

function rpc() {
  return {
    nodeUrl: devnet.rpcUrls.public.http[0]
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      retry: false
    }
  }
});

function StarknetConfig({
  children
}: {
  children: React.ReactNode;
  connectorOptions?: Partial<MockConnectorOptions>;
}) {
  const chains = [devnet, mainnet];
  const provider = jsonRpcProvider({ rpc });
  const connectors = [defaultConnector];

  // defaultConnector.options = {
  //   ...defaultConnector.options,
  //   ...connectorOptions
  // };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return (
    <OgStarknetConfig
      chains={chains}
      provider={provider}
      connectors={connectors}
      queryClient={queryClient}
    >
      {children}
    </OgStarknetConfig>
  );
}

function customRender(
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> & {
    connectorOptions?: Partial<MockConnectorOptions>;
  } = {}
): RenderResult {
  const { connectorOptions, ...renderOptions } = options;
  queryClient.clear();

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <StarknetConfig connectorOptions={connectorOptions}>
          <ArkProvider config={config}>{children}</ArkProvider>
        </StarknetConfig>
      </QueryClientProvider>
    ),
    ...renderOptions
  });
}

function customRenderHook<RenderResult, Props>(
  render: () => RenderResult,
  options: Omit<RenderHookOptions<Props>, "wrapper"> & {
    connectorOptions?: Partial<MockConnectorOptions>;
  } = {}
) {
  const { connectorOptions, hydrate, ...renderOptions } = options;
  queryClient.clear();

  return renderHook(render, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <StarknetConfig connectorOptions={connectorOptions}>
          <ArkProvider config={config}>{children}</ArkProvider>
        </StarknetConfig>
      </QueryClientProvider>
    ),
    hydrate: hydrate as false | undefined,
    ...renderOptions
  });
}

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
