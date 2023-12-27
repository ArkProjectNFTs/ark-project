import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useCreateListing } from "@ark-project/react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function CreateListing() {
  const { account } = useAccount();
  const { response, createListing, status } = useCreateListing();

  const formSchema = z.object({
    brokerId: z.number(),
    tokenAddress: z
      .string()
      .startsWith("0x", { message: "Please enter a valid address" })
      .length(66, { message: "Please enter a valid address" }),
    tokenId: z
      .string()
      .regex(/^\d+$/, { message: "Token ID must be a number" }),
    startAmount: z.number()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brokerId: 123,
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
      tokenId: "12",
      startAmount: 600000000000000000
    }
  });

  if (account === undefined) return;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined) return;
    const processedValues = {
      ...values,
      tokenId: parseInt(values.tokenId, 10)
    };
    createListing(account, processedValues);
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
                  <Input placeholder="Broker Id" {...field} />
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
}
