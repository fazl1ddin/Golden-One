// Scheduled collections policy runner.

import type { FastifyBaseLogger } from "fastify";
import { config } from "../config.js";
import { runCollectionsPolicy } from "../services/collections.service.js";

export interface CollectionsWorker {
  stop: () => void;
  runOnce: () => Promise<void>;
}

export function startCollections(log: FastifyBaseLogger): CollectionsWorker {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let stopped = false;

  const runOnce = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      const result = await runCollectionsPolicy();
      if (result.statusChanged || result.warned || result.locked) {
        log.info({ ...result }, "collections policy run");
      }
    } catch (err) {
      // The API must keep serving even if this policy pass fails.
      log.error({ err }, "collections policy pass failed");
    } finally {
      running = false;
    }
  };

  if (config.COLLECTIONS_INTERVAL_MS > 0) {
    timer = setInterval(() => void runOnce(), config.COLLECTIONS_INTERVAL_MS);
    timer.unref();
    log.info(
      {
        intervalMs: config.COLLECTIONS_INTERVAL_MS,
        autoLock: config.AUTO_LOCK_ENABLED,
        warnAfterDays: config.WARN_AFTER_DAYS,
        autoLockAfterDays: config.AUTO_LOCK_AFTER_DAYS,
      },
      config.AUTO_LOCK_ENABLED
        ? "collections policy started — AUTO-LOCK IS ENABLED"
        : "collections policy started (auto-lock disabled, warnings only)",
    );
  } else {
    log.warn("collections policy disabled (COLLECTIONS_INTERVAL_MS=0)");
  }

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
    runOnce,
  };
}
