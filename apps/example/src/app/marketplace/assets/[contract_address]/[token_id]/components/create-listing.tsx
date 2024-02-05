"use client";

import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { Web3 } from "web3";
import * as z from "zod";

import { useCreateListing } from "@ark-project/react";

import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface OrderBookActionsProps {
  token?: any;
  tokenMarketData?: any;
}

const CreateListing: React.FC<OrderBookActionsProps> = ({
  token,
  tokenMarketData
}) => {
  const { address, account } = useAccount();
  const isOwner = address && areAddressesEqual(token.owner, address);
  const { response, createListing, status } = useCreateListing();

  // Define the schema for startAmount only
  const formSchema = z.object({
    startAmount: z.string()
  });

  // Initialize form with startAmount's default value
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startAmount: Web3.utils.fromWei(42000000000000000, "ether")
    }
  });

  if (account === undefined || !isOwner || tokenMarketData.is_listed) return;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined || !token?.contract_address || !token?.token_id) {
      console.error("Account, token address, or token ID is missing");
      return;
    }

    // Convert tokenId to a number
    const tokenIdNumber = parseInt(token.token_id, 10);
    if (isNaN(tokenIdNumber)) {
      console.error("Invalid token ID");
      return;
    }

    // Prepare the data for submission, including props data
    const processedValues = {
      brokerId: 123, // Assuming this is a static value or received from elsewhere
      tokenAddress: token?.contract_address,
      tokenId: parseInt(token.token_id, 10),
      startAmount: Web3.utils.toWei(values.startAmount, "ether")
    };

    await createListing({
      starknetAccount: account,
      ...processedValues
    });
  }

  // Render the component
  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Create a listing</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full space-x-4 justify-between items-end"
        >
          <div className="w-[80%]">
            <FormField
              control={form.control}
              name="startAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Price in ETH</FormLabel>
                  <FormControl>
                    <Input placeholder="your price" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-[20%]">
            {account
              ? status === "loading"
                ? "Loading..."
                : status === "error"
                  ? "Error"
                  : status === "success"
                    ? "Success"
                    : "Create Listing"
              : "Connect your wallet"}
          </Button>
        </form>
      </Form>
      {!!response && (
        <div className="mt-4">response: {response?.toString()}</div>
      )}
    </div>
  );
};

export default CreateListing;
