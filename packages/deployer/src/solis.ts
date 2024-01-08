export async function setSolisAddresses(
  orderbookAddress: string,
  executorAddress: string,
  nodeUrl: string
) {
  const url = nodeUrl;
  const postData = {
    jsonrpc: "2.0",
    id: "1",
    method: "katana_setSolisAddresses",
    params: {
      addresses: {
        orderbook_arkchain: orderbookAddress,
        executor_starknet: executorAddress
      }
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
