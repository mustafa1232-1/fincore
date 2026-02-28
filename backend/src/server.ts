import { createApp } from "./app";
import { env } from "./config/env";
import { query } from "./database/pool";

const start = async (): Promise<void> => {
  await query("SELECT 1");

  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`FinCore backend running on port ${env.PORT}`);
  });
};

void start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
