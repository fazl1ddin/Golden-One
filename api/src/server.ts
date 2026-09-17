// Entry point: boots the HTTP server and the command reconciler.

import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { startReconciler } from "./workers/reconciler.js";
import { startCollections } from "./workers/collections.js";

async function main(): Promise<void> {
  const app = await buildApp();
  const reconciler = startReconciler(app.log);
  const collections = startCollections(app.log);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    // A second Ctrl-C during a slow drain should not tear down mid-write.
    if (shuttingDown) return;
    shuttingDown = true;

    app.log.info(`Received ${signal}, shutting down`);
    reconciler.stop();
    collections.stop();
    try {
      // close() stops accepting new connections and lets in-flight requests
      // finish — an MDM lock must not be abandoned halfway through.
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    app.log.error({ err: reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    // A process in an unknown state must not keep serving lock commands.
    app.log.fatal({ err }, "Uncaught exception, exiting");
    process.exit(1);
  });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
