"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";

import Authentification from "@/components/authentification";
import { MainNav } from "@/components/main-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/user-nav";

function AuthSwitcher(props: React.PropsWithChildren) {
  const { account } = useAccount();
  if (account === undefined) return <Authentification />;

  const { children } = props;
  return (
    <div className="hidden flex-col md:flex">
      <div className="border-b">
        <div className="container mx-auto">
          <div className="flex h-16 items-center">
            <MainNav />
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto flex-1 space-y-4 p-8 pt-6">
        {children}
      </div>
    </div>
  );
}

export default AuthSwitcher;
