import fs from "node:fs/promises";
import path from "node:path";
import { query, withTransaction } from "./pool";

const resolveMigrationsDir = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), "src", "database", "migrations"),
    path.resolve(__dirname, "migrations")
  ];

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
    } catch {
      // No-op: try next candidate.
    }
  }

  throw new Error("Could not locate migrations directory.");
};

const migrate = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = await resolveMigrationsDir();
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const { rowCount } = await query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if ((rowCount ?? 0) > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf-8");

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    });

    // eslint-disable-next-line no-console
    console.log(`Applied migration: ${file}`);
  }
};

void migrate()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Migrations complete.");
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", error);
    process.exit(1);
  });
