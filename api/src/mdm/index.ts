// MDM factory — selects the adapter by env MDM_PROVIDER (default "mock").

import { MockAdapter } from "./MockAdapter.js";
import { MosyleAdapter } from "./MosyleAdapter.js";
import type { DeviceManager } from "./types.js";

export * from "./types.js";
export { MockAdapter } from "./MockAdapter.js";
export { MosyleAdapter } from "./MosyleAdapter.js";

let cached: DeviceManager | null = null;

export function createDeviceManager(
  provider = process.env.MDM_PROVIDER ?? "mock",
): DeviceManager {
  switch (provider.toLowerCase()) {
    case "mosyle":
      return new MosyleAdapter();
    case "mock":
      return new MockAdapter();
    default:
      throw new Error(
        `Unknown MDM_PROVIDER "${provider}". Supported: mock, mosyle.`,
      );
  }
}

/** Process-wide singleton used by services. */
export function getDeviceManager(): DeviceManager {
  if (!cached) cached = createDeviceManager();
  return cached;
}
