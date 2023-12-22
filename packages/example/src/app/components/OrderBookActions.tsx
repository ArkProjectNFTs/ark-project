import { useAccount } from "@starknet-react/core";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Cancel from "./Cancel";
import CreateListing from "./CreateListing";
import CreateOffer from "./CreateOffer";
import FulfillListing from "./FulfillListing";
import FulfillOffer from "./FulfillOffer";

export default function OrderBookActions() {
  const { account } = useAccount();
  if (account === undefined) return;

  return (
    <Tabs defaultValue="createListing">
      <TabsList>
        <TabsTrigger value="createListing">Create Listing</TabsTrigger>
        <TabsTrigger value="createOffer">Create Offer</TabsTrigger>
        <TabsTrigger value="cancel">Cancel</TabsTrigger>
        <TabsTrigger value="fulfillListing">Fulfill Listing</TabsTrigger>
        <TabsTrigger value="fulfillOffer">Fulfill Offer</TabsTrigger>
      </TabsList>
      <TabsContent value="createListing" className="mx-auto">
        <CreateListing />
      </TabsContent>
      <TabsContent value="createOffer">
        <CreateOffer />
      </TabsContent>
      <TabsContent value="cancel">
        <Cancel />
      </TabsContent>
      <TabsContent value="fulfillListing">
        <FulfillListing />
      </TabsContent>
      <TabsContent value="fulfillOffer">
        <FulfillOffer />
      </TabsContent>
    </Tabs>
  );
}
