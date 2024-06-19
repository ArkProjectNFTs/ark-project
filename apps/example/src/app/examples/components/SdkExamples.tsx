import React from "react";

import Tab from "@/components/ui/tab-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Cancel from "./Cancel";
import CreateAuction from "./CreateAuction";
import CreateListing from "./CreateListing";
import CreateOffer from "./CreateOffer";
import FulfillAuction from "./FulfillAuction";
import FulfillListing from "./FulfillListing";
import FulfillOffer from "./FulfillOffer";

const SdkExamples = () => {
  return (
    <div className="flex w-full space-x-4">
      <Tabs defaultValue="createListing" className="basis-1/2">
        <TabsList>
          <TabsTrigger value="createListing">useCreateListing</TabsTrigger>
          <TabsTrigger value="createAuction">useCreateAuction</TabsTrigger>
          <TabsTrigger value="createOffer">useCreateOffer</TabsTrigger>
        </TabsList>
        <TabsContent value="createListing" className="mx-auto">
          <Tab
            cardTitle="Create a listing"
            cardDescription="A form illustrating how to create a listing using useCreateListing hook."
          >
            <CreateListing />
          </Tab>
        </TabsContent>
        <TabsContent value="createAuction">
          <Tab
            cardTitle="Create an auction"
            cardDescription="A form illustrating how to create an auction using useCreateAuction hook."
          >
            <CreateAuction />
          </Tab>
        </TabsContent>
        <TabsContent value="createOffer">
          <Tab
            cardTitle="Create an offer"
            cardDescription="A form illustrating how to create an offer using useCreateOffer hook."
          >
            <CreateOffer />
          </Tab>
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="cancel" className="basis-1/2">
        <TabsList>
          <TabsTrigger value="cancel">useCancel</TabsTrigger>
          <TabsTrigger value="fulfillListing">useFulfillListing</TabsTrigger>
          <TabsTrigger value="fulfillAuction">useFulfillAuction</TabsTrigger>
          <TabsTrigger value="fulfillOffer">useFulfillOffer</TabsTrigger>
        </TabsList>
        <TabsContent value="cancel">
          <Tab
            cardTitle="Cancel an order"
            cardDescription="A form illustrating how to cancel an order using useCancel hook."
          >
            <Cancel />
          </Tab>
        </TabsContent>
        <TabsContent value="fulfillListing">
          <Tab
            cardTitle="Fulfill a listing"
            cardDescription="A form illustrating how to fulfill a listing using useFulfillListing hook."
          >
            <FulfillListing />
          </Tab>
        </TabsContent>
        <TabsContent value="fulfillAuction">
          <Tab
            cardTitle="Fulfill an auction"
            cardDescription="A form illustrating how to fulfill an auction using useFulfillAuction hook."
          >
            <FulfillAuction />
          </Tab>
        </TabsContent>
        <TabsContent value="fulfillOffer">
          <Tab
            cardTitle="Fulfill an offer"
            cardDescription="A form illustrating how to fulfill an offer using useFulfillOffer hook."
          >
            <FulfillOffer />
          </Tab>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SdkExamples;
