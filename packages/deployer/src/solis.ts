export async function setSolisAddresses(
  orderbookAddress: string,
  executorAddress: string,
  nodeUrl: string
) {
  const url = nodeUrl;
  const user = process.env.RPC_USER;
  const password = process.env.RPC_PASSWORD;
  if (!user || !password) {
    throw new Error("RPC_USER and RPC_PASSWORD must be set in the .env file");
  }
  const basic_auth = Buffer.from(`${user}:${password}`).toString("base64");
  const postData = {
    jsonrpc: "2.0",
    id: "1",
    method: "solis_setSolisAddresses",
    params: {
      addresses: {
        orderbook_arkchain: orderbookAddress,
        executor_starknet: executorAddress
      },
      basic_auth
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await response.json();
    console.log("Ok");
  } catch (error) {
    console.error("Error:", error);
  }
}
