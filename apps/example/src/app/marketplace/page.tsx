import { promises as fs } from "fs";
import path from "path";

import { Metadata } from "next";
import Image from "next/image";
import { z } from "zod";

import AuthSwitcher from "@/components/authSwitcher";

import { UserNav } from "./components/user-nav";
import { columns } from "./explore/components/columns";
import { DataTable } from "./explore/components/data-table";
import { tokenSchema } from "./explore/data/schema";

export const metadata: Metadata = {
  title: "Tasks",
  description: "A task and issue tracker build using Tanstack Table."
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
  return (
    <>
      <AuthSwitcher>
        <div className="md:hidden">
          <Image
            src="/examples/tasks-light.png"
            width={1280}
            height={998}
            alt="Playground"
            className="block dark:hidden"
          />
          <Image
            src="/examples/tasks-dark.png"
            width={1280}
            height={998}
            alt="Playground"
            className="hidden dark:block"
          />
        </div>
        <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome 0x0!
              </h2>
              <p className="text-muted-foreground">
                Explore the Everai testnet collection
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <UserNav />
            </div>
          </div>
          <DataTable data={tokens} columns={columns} />
        </div>
      </AuthSwitcher>
    </>
  );
}
