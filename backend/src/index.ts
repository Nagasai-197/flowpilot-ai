import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

const server = app.listen(config.PORT, () => {
  logger.info(
    `🚀 FlowPilot Core Engine running in [${config.NODE_ENV}] mode on port ${config.PORT}`,
  );
});

// Graceful Shut-down Process
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down Express server gracefully...`);

  server.close(() => {
    logger.info("Express server closed successfully.");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
