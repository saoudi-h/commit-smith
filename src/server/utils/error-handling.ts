import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export function setupErrorHandling(server: Server) {
  server.onerror = (error) => {
    console.error("[CommitSmith Server Error]", error);
  };

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}
