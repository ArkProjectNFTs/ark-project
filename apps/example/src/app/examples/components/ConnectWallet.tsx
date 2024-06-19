import { useConnect } from "@starknet-react/core";

import { Button } from "@/components/ui/Button";

export default function ConnectWallet() {
  const { connectors, connect } = useConnect();

  return (
    <div className="inline-flex flex-row gap-2 items-center justify-center">
      {connectors.map((connector) => {
        return (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="gap-x-2"
          >
            {connector.id}
          </Button>
        );
      })}
    </div>
  );
}
