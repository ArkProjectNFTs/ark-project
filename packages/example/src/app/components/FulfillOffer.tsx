import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useFulfillOffer } from "@ark-project/react";

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

export default function FulfillOffer() {
  const { account } = useAccount();
  const { fulfillOffer, status } = useFulfillOffer();

  const formSchema = z.object({
    order_hash: z.string(),
    token_address: z
      .string()
      .startsWith("0x", { message: "Please enter a valid address" })
      .length(66, { message: "Please enter a valid address" }),
    token_id: z.number()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_hash: undefined,
      token_address:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
      token_id: 12
    }
  });

  if (account === undefined) return;

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined) return;
    fulfillOffer(account, values);
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="order_hash"
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
            name="token_address"
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
            name="token_id"
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
          <Button type="submit">
            {account
              ? status === "loading"
                ? "Loading..."
                : status === "error"
                  ? "Error"
                  : status === "success"
                    ? "Success"
                    : "Fulfill Offer"
              : "Connect your wallet"}
          </Button>
        </form>
      </Form>
    </>
  );
}
