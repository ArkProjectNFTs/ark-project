"use client";

import React, { useEffect } from "react";

import { env } from "@/env";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { parseEther } from "viem";
import * as z from "zod";

import { useCreateListing } from "@ark-project/react";

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

interface Token {
  token_id?: string;
  contract_address?: string;
}

interface OrderBookActionsProps {
  currentToken?: Token;
}

const CreateListing: React.FC<OrderBookActionsProps> = ({ currentToken }) => {
  const { account } = useAccount();
  const { response, createListing, status } = useCreateListing();

  const formSchema = z.object({
    brokerId: z.string(),
    tokenAddress: z
      .string()
      .startsWith("0x", { message: "Please enter a valid address" })
      .length(66, { message: "Please enter a valid address" }),
    tokenId: z
      .string()
      .regex(/^\d+$/, { message: "Token ID must be a number" }),
    startAmount: z.string()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brokerId: env.NEXT_PUBLIC_BROKER_ID,
      tokenAddress: currentToken?.contract_address,
      tokenId: currentToken?.token_id,
      startAmount: "0.1"
    }
  });

  useEffect(() => {
    if (currentToken) {
      form.reset({
        ...form.getValues(),
        tokenAddress: currentToken.contract_address,
        tokenId: currentToken.token_id
      });
    }
  }, [currentToken, form]);

  if (account === undefined) return;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined) return;
    const processedValues = {
      ...values,
      tokenId: BigInt(values.tokenId),
      startAmount: parseEther("0.1")
    };
    createListing({
      starknetAccount: account,
      ...processedValues
    });
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

export default CreateListing;
