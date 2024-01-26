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

import SdkExamples from "./components/SdkExamples";

export default function Home() {
  return (
    <>
      <PageHeader>
        <Announcement />
        <PageHeaderHeading className="hidden md:block">
          Ark Project: SDK hooks Examples
        </PageHeaderHeading>
        <PageHeaderHeading className="md:hidden">Examples</PageHeaderHeading>
        <PageHeaderDescription>
          Here, you'll find comprehensive examples for creating listing and
          offer orders, canceling orders, and fulfilling transactions. These
          forms are designed to demonstrate both mandatory and optional data
          required to effectively utilize our React SDK hooks for all these
          actions.
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
      <SdkExamples />
    </>
  );
}
