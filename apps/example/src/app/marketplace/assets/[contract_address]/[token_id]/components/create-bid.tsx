"use client";

import { useEffect, useState } from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useAccount } from "@starknet-react/core";
import { useForm } from "react-hook-form";
import { formatEther, parseEther } from "viem";
import * as z from "zod";

import { useConfig, useCreateOffer } from "@ark-project/react";

import { Token } from "@/types/schema";
import { areAddressesEqual } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import TokenMedia from "./token-media";

interface CreateOfferProps {
  token: Token;
  tokenMarketData: TokenMarketData;
}

export default function CreateBid({
  token,
  tokenMarketData
}: CreateOfferProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      startAmount: formatEther(BigInt(tokenMarketData.start_amount))
    }
  });

  useEffect(() => {
    form.reset();
  }, [form, isOpen]);

  useEffect(() => {
    if (response) {
      setIsOpen(false);
    }
  }, [response]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!account || !config) {
      return;
    }

    const tokenIdNumber = parseInt(token.token_id, 10);

    if (isNaN(tokenIdNumber)) {
      console.error("Invalid token ID");
      return;
    }

    const processedValues = {
      brokerId: env.NEXT_PUBLIC_BROKER_ID,
      currencyAddress: config.starknetCurrencyContract,
      tokenAddress: token.contract_address,
      tokenId: BigInt(token.token_id),
      startAmount: parseEther(values.startAmount)
    };

    await createOffer({
      starknetAccount: account,
      ...processedValues
    });
  }

  if (!account || isOwner) {
    return;
  }

  const isDisabled = form.formState.isSubmitting || status === "loading";
  const price = formatEther(BigInt(tokenMarketData.start_amount));
  const reservePrice = formatEther(BigInt(tokenMarketData.end_amount));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Place a bid</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place a bid</DialogTitle>
        </DialogHeader>
        <div className="flex space-x-4 items-center">
          <div className="w-16 rounded overflow-hidden">
            <TokenMedia token={token} />
          </div>
          <div className="">
            <div className="font-bold">Duo #{token.token_id}</div>
            <div className="text-muted-foreground">Everai</div>
          </div>
          <div className="grow" />
          <div className="">
            <div className="font-bold text-right">{price} ETH</div>
            <div className="text-muted-foreground text-right">
              Reserve {reservePrice} ETH
            </div>
          </div>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col space-y-4"
          >
            <FormField
              control={form.control}
              name="startAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" placeholder="Price" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isDisabled}>
              {status === "loading" ? (
                <ReloadIcon className="animate-spin" />
              ) : (
                "Place a bid"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    //   <div className="mt-4">
    //     {status === "loading" && "Transaction in progress..."}
    //     {status === "error" && "Error"}
    //     {status === "success" && "Transaction successful"}
    //     <br />
    //     {!!response && status === "success" && (
    //       <p>order_hash: {response?.toString()}</p>
    //     )}
    //   </div>
    // </div>
  );
}
