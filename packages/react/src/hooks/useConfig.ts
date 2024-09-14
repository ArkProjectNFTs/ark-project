"use client";

import { useContext } from "react";

import { ArkContext } from "../components/ArkProvider";

function useConfig() {
  const context = useContext(ArkContext);

  if (context === undefined) {
    throw new Error("useConfig must be used within a ArkProvider");
  }

  return context;
}

export { useConfig };
