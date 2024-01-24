"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { Announcement } from "@/components/announcement";
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading
} from "@/components/page-header";
import { buttonVariants } from "@/components/ui/Button";

import PortFolio from "./components/Portfolio";

export default function Home() {
  return (
    <div className="container relative">
      <PageHeader>
        <Announcement />
        <PageHeaderHeading className="hidden md:block">
          Portfolio examples
        </PageHeaderHeading>
        <PageHeaderHeading className="md:hidden">Examples</PageHeaderHeading>
        <PageHeaderDescription>
          An interactive portfolio demo of our SDK's. Here, you can effortlessly
          list your NFTs for sale, cancel listing or accept offers directly.
          This example highlights how seamlessly our SDK integrates into
          managing and transacting with your users digital assets.
        </PageHeaderDescription>
        <PageActions>
          <Link
            target="_blank"
            href="https://docs.arkproject.dev"
            className={cn(buttonVariants(), "rounded-[6px]")}
          >
            Documentation
          </Link>
          <Link
            href="/examples"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-[6px]"
            )}
          >
            SDK Examples
          </Link>
        </PageActions>
      </PageHeader>
      <PortFolio />
    </div>
  );
}
