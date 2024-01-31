"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { Web3 } from "web3";
import * as z from "zod";

import { useConfig, useCreateOffer } from "@ark-project/react";

import { Button } from "@/components/ui/Button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface CreateOfferProps {
  token: any;
}

export default function CreateOffer({ token }: CreateOfferProps) {
  const config = useConfig();
  const { account } = useAccount();
  const { response, createOffer, status } = useCreateOffer();

  const formSchema = z.object({
    startAmount: z.string()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startAmount: Web3.utils.fromWei(42000000000000000, "ether")
    }
  });

  if (account === undefined) return;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined) return;

    const tokenIdNumber = parseInt(token.token_id, 10);
    if (isNaN(tokenIdNumber)) {
      console.error("Invalid token ID");
      return;
    }

    const processedValues = {
      brokerId: 123,
      currencyAddress: config?.starknetContracts.eth,
      tokenAddress: token.contract_address,
      tokenId: tokenIdNumber,
      startAmount: Web3.utils.toWei(values.startAmount, "ether")
    };

    createOffer(account, processedValues);
  }

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
                  <FormLabel>Start Amount</FormLabel>
                  <FormDescription>
                    value sent to the function should be in wei
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Broker Id" {...field} />
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
                    : "Create Offer"
              : "Connect your wallet"}
          </Button>
        </form>
      </Form>
      {!!response && (
        <div className="mt-4">response: {response?.toString()}</div>
      )}
    </div>
  );
}
