import { env } from "@/env";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useFulfillAuction } from "@ark-project/react";

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

const formSchema = z.object({
  orderHash: z.string(),
  relatedOrderHash: z.string(),
  startAmount: z.string(),
  brokerId: z.string(),
  tokenAddress: z
    .string()
    .startsWith("0x", { message: "Please enter a valid address" })
    .length(66, { message: "Please enter a valid address" }),
  tokenId: z.string().regex(/^\d+$/, { message: "Token ID must be a number" })
});

export default function FulfillAuction() {
  const { account } = useAccount();
  const { fulfill, status } = useFulfillAuction();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startAmount: "0.042",
      orderHash: undefined,
      relatedOrderHash: undefined,
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
      tokenId: "12",
      brokerId: env.NEXT_PUBLIC_BROKER_ID
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!account) {
      return;
    }

    const processedValues = {
      ...values,
      tokenId: parseInt(values.tokenId, 10)
    };

    fulfill({
      starknetAccount: account,
      ...processedValues
    });
  }

  if (!account) {
    if (!account) {
      return <ConnectWallet />;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="orderHash"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Hash</FormLabel>
              <FormControl>
                <Input placeholder="Order Hash" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="relatedOrderHash"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Order Hash</FormLabel>
              <FormControl>
                <Input placeholder="Related Order Hash" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brokerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Broker Id</FormLabel>
              <FormControl>
                <Input placeholder="Token Id" {...field} />
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
              <FormLabel>Start amount</FormLabel>
              <FormControl>
                <Input placeholder="Token Id" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">
          {status === "loading"
            ? "Loading..."
            : status === "error"
              ? "Error"
              : status === "success"
                ? "Success"
                : "Fulfill Auction"}
        </Button>
      </form>
    </Form>
  );
}
