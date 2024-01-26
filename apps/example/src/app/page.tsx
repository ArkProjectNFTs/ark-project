"use client";

import Image from "next/image";
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

export default function Home() {
  return (
    <>
      <PageHeader className="md:pb-0 lg:pb-0">
        <Announcement />
        <PageHeaderHeading className="hidden md:block">
          Ark Project: React SDK Demo
        </PageHeaderHeading>
        <PageHeaderHeading className="md:hidden">Examples</PageHeaderHeading>
        <PageHeaderDescription>
          Explore key features of the Ark Project with our React SDK demo.
          Create, manage, and fulfill orders, mint testnet NFTs, and delve into
          various transactions. Experience our SDK and API in a user-friendly
          environment.
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
      <Image
        src="/login.png"
        alt="illustration"
        width="1758"
        height="595"
        className="w-full"
      />
    </>
  );
}
