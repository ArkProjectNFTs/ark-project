"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { Web3 } from "web3";
import * as z from "zod";

import { useConfig, useCreateOffer } from "@ark-project/react";

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

interface CreateOfferProps {
  token: any;
  tokenMarketData: any;
}

export default function CreateOffer({ token }: CreateOfferProps) {
  const config = useConfig();
  const { account, address } = useAccount();
  const { response, createOffer, status } = useCreateOffer();
  const isOwner = address && areAddressesEqual(token.owner, address);
  const formSchema = z.object({
    startAmount: z.string()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startAmount: Web3.utils.fromWei(42000000000000000, "ether")
    }
  });

  if (account === undefined || isOwner) return;

  async function onSubmit(values: z.infer<typeof formSchema>) {
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

    await createOffer({
      starknetAccount: account,
      ...processedValues
    });
  }

  return (
    <div className="w-full flex flex-col space-y-4 rounded border p-4">
      <h1>Place a bid</h1>
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
                  <FormLabel>Bid price in Eth</FormLabel>
                  <FormControl>
                    <Input placeholder="your price" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-[20%]">
            {status === "loading" ? (
              <ReloadIcon className="animate-spin" />
            ) : (
              "Create Offer"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-4">
        {status === "loading" && "Transaction in progress..."}
        {status === "error" && "Error"}
        {status === "success" && "Transaction successful"}
        <br />
        {!!response && status === "success" && (
          <p>order_hash: {response?.toString()}</p>
        )}
      </div>
    </div>
  );
}
