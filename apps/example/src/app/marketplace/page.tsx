import { Metadata } from "next";

import { columns } from "./explore/components/columns";
import { DataTable } from "./explore/components/data-table";

export const metadata: Metadata = {
  title: "Marketplace - examples",
  description: "Check out some examples app built using the Ark SDK hooks."
};

// Simulate a database read for tasks.
async function getData() {
  const response = await fetch(
    `https://testnet-api.arkproject.dev/v1/tokens/0x05796ca7d7c1eec6ff70b34a15806b91634cda4b8a833e0a7802dcbcbc0c7ced`,
    {
      headers: {
        "x-api-key": "AY1oXgEAmF139oBoxDSomzVnHqy8ZdQ2NxLmzJ6i"
      }
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
}

export default async function TaskPage() {
  const { result: tokens } = await getData();
  return <DataTable data={tokens} columns={columns} />;
}
