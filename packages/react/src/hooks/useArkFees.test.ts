import { expect, it } from "vitest";

import { renderHook } from "../test/react";
import { useArkFees } from "./useArkFees";

it("default", async () => {
  const { result, rerender } = renderHook(() => useArkFees());

  expect(result.current.isSuccess).toBe(false);
  rerender();
  expect(result.current.isSuccess).toBe(true);
});
