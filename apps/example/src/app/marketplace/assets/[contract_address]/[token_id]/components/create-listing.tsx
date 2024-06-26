"use client";

import React from "react";

import { env } from "@/env";
import { TokenMarketData } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount } from "@starknet-react/core";
import moment from "moment";
import { useForm } from "react-hook-form";
import { parseEther } from "viem";
import * as z from "zod";

import { useCreateAuction, useCreateListing } from "@ark-project/react";

import { Token } from "@/types/schema";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface OrderBookActionsProps {
  token?: Token;
  tokenMarketData?: TokenMarketData;
}

const FIXED = "fixed";
const AUCTION = "auction";

const formSchema = z.object({
  startAmount: z.string({
    invalid_type_error: "Please enter a valid amount"
  }),
  endAmount: z
    .string({
      invalid_type_error: "Please enter a valid amount"
    })
    .optional(),
  duration: z.string(),
  type: z.enum([FIXED, AUCTION])
});
// .refine(
//   (data) =>
//     data.type === AUCTION ? data.endAmount > data.startAmount : true,
//   {
//     message: "Reserve price must be greater than starting price",
//     path: ["endAmount"]
//   }
// );

const CreateListing: React.FC<OrderBookActionsProps> = ({ token }) => {
  const { account } = useAccount();
  const { createListing, status } = useCreateListing();
  const { create: createAuction, status: statusAuction } = useCreateAuction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      type: FIXED,
      startAmount: "0.1",
      duration: "1"
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (account === undefined || !token?.contract_address || !token?.token_id) {
      console.error("Account, token address, or token ID is missing");
      return;
    }

    const tokenId = parseInt(token.token_id, 10);

    if (isNaN(tokenId)) {
      console.error("Invalid tokenId");
      return;
    }

    const processedValues = {
      brokerId: env.NEXT_PUBLIC_BROKER_ID,
      tokenAddress: token?.contract_address,
      tokenId: BigInt(token.token_id),
      startAmount: parseEther(values.startAmount),
      endAmount: values.endAmount ? parseEther(values.endAmount) : BigInt(0),
      endDate: moment().add(values.duration, "hours").unix()
    };

    try {
      if (values.type === AUCTION) {
        await createAuction({
          starknetAccount: account,
          brokerId: env.NEXT_PUBLIC_BROKER_ID,
          tokenAddress: token.contract_address,
          tokenId: processedValues.tokenId,
          endDate: processedValues.endDate,
          startAmount: processedValues.startAmount,
          endAmount: processedValues.endAmount
        });
      } else {
        await createListing({
          starknetAccount: account,
          brokerId: env.NEXT_PUBLIC_BROKER_ID,
          tokenAddress: token.contract_address,
          tokenId: processedValues.tokenId,
          endDate: processedValues.endDate,
          startAmount: processedValues.startAmount
        });
      }
    } catch (error) {
      console.error("error: create listing failed", error);
    }
  }

  const isLoading = status === "loading" || statusAuction === "loading";
  const isAuction = form.getValues("type") === AUCTION;
  const duration = form.watch("duration");
  const expiredAt = moment().add(duration, "hours").format("LLLL");

  return (
    <div className="w-full border rounded p-4">
      <div className="font-semibold mb-4">List for sale</div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col space-y-4"
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="">
                <FormLabel>Choose a type of sale</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="border rounded gap-0"
                  >
                    <FormItem className="flex items-center justify-center p-4 border-b">
                      <FormLabel className="font-normal flex flex-col space-y-2 flex-grow">
                        <span className="font-semibold">Fixed price</span>
                        <span className="">
                          The item is listed at the price you set.
                        </span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroupItem value={FIXED} className="h-6 w-6" />
                      </FormControl>
                    </FormItem>
                    <FormItem className="flex items-center justify-center p-4">
                      <FormLabel className="font-normal flex flex-col space-y-2 flex-grow">
                        <span className="font-semibold">
                          Sell to highest bidder
                        </span>
                        <span className="">
                          The item is listed for auction.
                        </span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroupItem value={AUCTION} className="h-6 w-6" />
                      </FormControl>
                    </FormItem>
                  </RadioGroup>
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
                <FormLabel>Starting Price</FormLabel>
                <FormControl>
                  <Input placeholder="Amount" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isAuction && (
            <FormField
              control={form.control}
              name="endAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price</FormLabel>
                  <FormControl>
                    <Input placeholder="Amount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between">
                  <FormLabel>Duration</FormLabel>
                  <div className="text-sm">Expires {expiredAt}</div>
                </div>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">1 day</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="" disabled={isLoading}>
            {isLoading ? "Loading..." : "Complete Listing"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateListing;
