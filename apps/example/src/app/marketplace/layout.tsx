"use client";

import Image from "next/image";
import Link from "next/link";
import { QueryClient, QueryClientProvider } from "react-query";

import { cn } from "@/lib/utils";
import { Announcement } from "@/components/announcement";
import AuthSwitcher from "@/components/authSwitcher";
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading
} from "@/components/page-header";
import { buttonVariants } from "@/components/ui/Button";

import { MainNav } from "./components/main-nav";
import { UserNav } from "./components/user-nav";

interface ExamplesLayoutProps {
  children: React.ReactNode;
}

export default function ExamplesLayout({ children }: ExamplesLayoutProps) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container relative">
        <PageHeader>
          <Announcement />
          <PageHeaderHeading className="hidden md:block">
            Mini marketplace example
          </PageHeaderHeading>
          <PageHeaderHeading className="md:hidden">Examples</PageHeaderHeading>
          <PageHeaderDescription>
            Mint, Explore, check your portfolio, list, buys, bid and sell NFTs.
          </PageHeaderDescription>
          <PageActions>
            <Link
              href="/docs"
              className={cn(buttonVariants(), "rounded-[6px]")}
            >
              Get Started
            </Link>
            <Link
              href="/components"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-[6px]"
              )}
            >
              Components
            </Link>
          </PageActions>
        </PageHeader>
        <section>
          <div className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-xl">
            <AuthSwitcher>
              <div className="md:hidden">
                <Image
                  src="/examples/tasks-light.png"
                  width={1280}
                  height={998}
                  alt="Playground"
                  className="block dark:hidden"
                />
                <Image
                  src="/examples/tasks-dark.png"
                  width={1280}
                  height={998}
                  alt="Playground"
                  className="hidden dark:block"
                />
              </div>
              <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
                <div className="flex items-center justify-between space-y-2">
                  <div className="flex items-center w-full">
                    <MainNav />
                    <div className="ml-auto flex items-center space-x-4">
                      <UserNav />
                    </div>
                  </div>
                </div>
                {children}
              </div>
            </AuthSwitcher>
          </div>
        </section>
      </div>
    </QueryClientProvider>
  );
}
