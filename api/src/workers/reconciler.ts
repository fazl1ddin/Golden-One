// Background reconciler.
//
// Apple MDM delivers commands asynchronously, so the answer to "did the phone
// actually lock?" only arrives later. This loop asks the MDM about every
// still-pending command and moves devices to their real state. Without it a
// device whose owner had the phone switched off would sit in LOCK_PENDING
// forever, and collections would be working from a fiction.

import type { FastifyBaseLogger } from "fastify";
import { config } from "../config.js";
import { reconcilePendingCommands } from "../services/device.service.js";

export interface Reconciler {
  stop: () => void;
  /** Exposed for tests: run one pass synchronously. */
  runOnce: () => Promise<void>;
}

export function startReconciler(log: FastifyBaseLogger): Reconciler {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let stopped = false;

  const runOnce = async (): Promise<void> => {
    // Overlapping passes would double-count attempts against the retry budget.
    if (running || stopped) return;
    running = true;
    try {
      const result = await reconcilePendingCommands();
      if (result.checked > 0) {
        log.info({ ...result }, "reconciled pending MDM commands");
      }
    } catch (err) {
      // Never let a reconciler failure take the process down — the API must
      // keep serving even when the MDM vendor is having an outage.
      log.error({ err }, "reconciler pass failed");
    } finally {
      running = false;
    }
  };

  if (config.RECONCILE_INTERVAL_MS > 0) {
    timer = setInterval(() => void runOnce(), config.RECONCILE_INTERVAL_MS);
    // Do not hold the event loop open just for this.
    timer.unref();
    log.info(
      { intervalMs: config.RECONCILE_INTERVAL_MS },
      "MDM command reconciler started",
    );
  } else {
    log.warn("MDM command reconciler disabled (RECONCILE_INTERVAL_MS=0)");
  }

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
    runOnce,
  };
}
