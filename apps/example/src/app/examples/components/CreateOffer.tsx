import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { Web3 } from "web3";
import * as z from "zod";

import { useCreateOffer } from "@ark-project/react";

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

export default function CreateOffer() {
  const { account } = useAccount();
  const { response, createOffer, status } = useCreateOffer();

  const formSchema = z.object({
    brokerId: z.number(),
    currencyAddress: z.string(),
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
      brokerId: 123,
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
      tokenId: "12",
      startAmount: Web3.utils.fromWei(42000000000000000, "ether")
    }
  });

  if (account === undefined) return;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined) return;
    const processedValues = {
      ...values,
      tokenId: parseInt(values.tokenId, 10),
      startAmount: Web3.utils.toWei(values.startAmount, "ether")
    };
    createOffer(account, processedValues);
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
                <FormDescription>
                  A referral ID to collect fees from trades initiated through
                  this referral.
                </FormDescription>
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
                <FormDescription>
                  Token Address of the token user want to buy
                </FormDescription>
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
                <FormDescription>
                  token id of the token user want to buy
                </FormDescription>
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
                <FormDescription>
                  value send to the function should be in wei
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currencyAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency address</FormLabel>
                <FormControl>
                  <Input placeholder="Currency address" {...field} />
                </FormControl>
                <FormDescription>
                  default:
                  0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f
                </FormDescription>
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
                    : "Create Offer"
              : "Connect your wallet"}
          </Button>
        </form>
      </Form>
      <div className="mt-4">response: {response?.toString()}</div>
    </>
  );
}
