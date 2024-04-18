"use client";

import React, { useEffect } from "react";

import { env } from "@/env";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { Web3 } from "web3";
import * as z from "zod";

import { useCreateAuction } from "@ark-project/react";

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

import ConnectWallet from "./ConnectWallet";

interface Token {
  token_id?: string;
  contract_address?: string;
}

interface OrderBookActionsProps {
  currentToken?: Token;
}

const formSchema = z.object({
  brokerId: z.string(),
  tokenAddress: z
    .string()
    .startsWith("0x", { message: "Please enter a valid address" })
    .length(66, { message: "Please enter a valid address" }),
  tokenId: z.string().regex(/^\d+$/, { message: "Token ID must be a number" }),
  startAmount: z.string(),
  endAmount: z.string()
});

const CreateAuction: React.FC<OrderBookActionsProps> = ({ currentToken }) => {
  const { account } = useAccount();
  const { create, response, status } = useCreateAuction();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brokerId: env.NEXT_PUBLIC_BROKER_ID,
      tokenAddress: currentToken?.contract_address,
      tokenId: currentToken?.token_id,
      startAmount: Web3.utils.fromWei(42000000000000000, "ether"),
      endAmount: Web3.utils.fromWei(84000000000000000, "ether")
    }
  });

  useEffect(() => {
    if (!currentToken) {
      return;
    }

    form.reset({
      ...form.getValues(),
      tokenAddress: currentToken.contract_address,
      tokenId: currentToken.token_id
    });
  }, [currentToken, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!account) {
      return;
    }

    await create({
      starknetAccount: account,
      ...values,
      tokenId: parseInt(values.tokenId, 10),
      startAmount: Web3.utils.toWei(values.startAmount, "ether"),
      endAmount: Web3.utils.toWei(values.endAmount, "ether")
    });
  }

  if (!account) {
    return <ConnectWallet />;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="brokerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Broker Id</FormLabel>
                <FormControl>
                  <Input placeholder="Broker Id" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tokenAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token Address</FormLabel>
                <FormControl>
                  <Input placeholder="Token Address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tokenId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token Id</FormLabel>
                <FormControl>
                  <Input placeholder="Token Id" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Amount</FormLabel>
                <FormControl>
                  <Input placeholder="Start Amount in ETH" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Amount</FormLabel>
                <FormControl>
                  <Input placeholder="End Amount in ETH" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
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
      <div className="mt-4">response: {response?.toString()}</div>
    </>
  );
};

export default CreateAuction;
