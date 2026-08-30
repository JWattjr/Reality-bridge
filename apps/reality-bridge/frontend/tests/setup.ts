import { webcrypto } from "node:crypto";

import { configure } from "@testing-library/dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom does not ship Web Crypto; the commitment and salt code requires a real
// CSPRNG and SHA-256, so the Node implementation is installed once here.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// The default 1s async budget is tight when five suites run in parallel on a
// busy machine, which showed up as intermittent failures rather than real ones.
configure({ asyncUtilTimeout: 5000 });

if (!("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:reality-bridge");
  globalThis.URL.revokeObjectURL = vi.fn();
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
