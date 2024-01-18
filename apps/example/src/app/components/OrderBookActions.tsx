import Tab from "@/components/ui/tab-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Cancel from "./Cancel";
import CreateListing from "./CreateListing";
import CreateOffer from "./CreateOffer";
import FulfillListing from "./FulfillListing";
import FulfillOffer from "./FulfillOffer";

export default function OrderBookActions() {
  return (
    <div className="flex w-full space-x-4">
      <Tabs defaultValue="createListing" className="basis-1/2">
        <TabsList>
          <TabsTrigger value="createListing">Create Listing</TabsTrigger>
          <TabsTrigger value="createOffer">Create Offer</TabsTrigger>
        </TabsList>
        <TabsContent value="createListing" className="mx-auto">
          <Tab>
            <CreateListing />
          </Tab>
        </TabsContent>
        <TabsContent value="createOffer">
          <Tab>
            <CreateOffer />
          </Tab>
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="cancel" className="basis-1/2">
        <TabsList>
          <TabsTrigger value="cancel">Cancel</TabsTrigger>
          <TabsTrigger value="fulfillListing">Fulfill Listing</TabsTrigger>
          <TabsTrigger value="fulfillOffer">Fulfill Offer</TabsTrigger>
        </TabsList>
        <TabsContent value="cancel">
          <Tab>
            <Cancel />
          </Tab>
        </TabsContent>
        <TabsContent value="fulfillListing">
          <Tab>
            <FulfillListing />
          </Tab>
        </TabsContent>
        <TabsContent value="fulfillOffer">
          <Tab>
            <FulfillOffer />
          </Tab>
        </TabsContent>
      </Tabs>
    </div>
  );
}
