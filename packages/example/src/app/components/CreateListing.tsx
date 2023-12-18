import { useAccount } from "@starknet-react/core";

import { useCreateListing } from "@ark-project/react";

import { Button } from "@/components/ui/Button";

export default function CreateListing() {
  const { response, createListing, status } = useCreateListing();

  return (
    <>
      <Button
        onClick={() =>
          createListing({
            brokerId: 123,
            tokenAddress:
              "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
            tokenId: 143,
            startAmount: 600000000000000000
          })
        }
      >
        {status === "loading"
          ? "Loading..."
          : status === "error"
            ? "Error"
            : status === "success"
              ? "Success"
              : "Create Listing"}
      </Button>
      {response}
    </>
  );
}
