"use client";

import React from "react";

import { useAccount } from "@starknet-react/core";

import Authentification from "@/components/authentification";

function AuthSwitcher(props: React.PropsWithChildren) {
  const { account } = useAccount();
  if (account === undefined) return <Authentification />;

  const { children } = props;
  return <div>{children}</div>;
}

export default AuthSwitcher;
