import { useAccount } from "@starknet-react/core";
import { shortString, TypedData } from "starknet";

import { Button } from "@/components/ui/button";

const Account = () => {
  const { account, address, status } = useAccount();

  if (status === "disconnected") return <p>Disconnected</p>;
  console.log(account);
  const signMessage = async () => {
    if (!account) return;
    const typedDataValidate: TypedData = {
      types: {
        StarkNetDomain: [
          { name: "name", type: "string" },
          { name: "version", type: "felt" },
          { name: "chainId", type: "felt" }
        ],
        Validate: [{ name: "orderhash", type: "felt" }]
      },
      primaryType: "Validate",
      domain: {
        name: "ArkProject",
        version: "1",
        chainId: shortString.encodeShortString("SN_MAIN")
      },
      message: {
        orderhash: "0x0000004f000f"
      }
    };
    const signature = await account.signMessage(typedDataValidate);
    console.log(signature);
    console.log(account);
  };

  return (
    <div>
      {/* <Button onClick={signMessage}>Sign Message</Button> */}
      <p>Account: {address}</p>
    </div>
  );
};

export default Account;
