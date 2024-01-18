"use client";

import { useContext } from "react";

import { OwnerDataContext } from "../components/ArkProvider/ArkProvider";

function useOwner() {
  const context = useContext(OwnerDataContext);
  return context;
}

export { useOwner };
