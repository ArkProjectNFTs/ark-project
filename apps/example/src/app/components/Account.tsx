import { useAccount } from "@starknet-react/core";

const Account = () => {
  const { address, status } = useAccount();

  if (status === "disconnected") return <p>Disconnected</p>;

  return (
    <div>
      <p>Account: {address}</p>
    </div>
  );
};

export default Account;
