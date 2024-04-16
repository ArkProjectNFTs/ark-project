"use client";

import { useContext } from "react";

import { ConfigDataContext } from "../components/ArkProvider";

function useConfig() {
  const context = useContext(ConfigDataContext);
  return context;
}

export { useConfig };
