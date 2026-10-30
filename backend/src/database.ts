import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client, Pool, type ClientConfig, type PoolClient, type PoolConfig } from "pg";
import { ROLE_CONFIGS } from "./config/gameConfig";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function resolveTargetDatabaseName(): string {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const dbFromPath = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (dbFromPath) {
        return dbFromPath;
      }
    } catch {
      return process.env.DB_NAME ?? "motive";
    }
  }
  return process.env.DB_NAME ?? "motive";
}

function buildAdminClientConfig(): ClientConfig {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      url.pathname = "/postgres";
      return {
        connectionString: url.toString(),
        connectionTimeoutMillis: 5_000
      };
    } catch {
      return {
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5_000
      };
    }
  }

  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: "postgres",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
    connectionTimeoutMillis: 5_000
  };
}

function buildPoolConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 15,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    };
  }

  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: resolveTargetDatabaseName(),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
    max: 15,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  };
}

export const database = new Pool(buildPoolConfig());

database.on("error", (error) => {
  console.error("Database pool error:", error.message);
});

export async function ensureDatabaseExists(): Promise<void> {
  const targetDb = resolveTargetDatabaseName();
  const adminClient = new Client(buildAdminClientConfig());

  try {
    await adminClient.connect();
    const existing = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (existing.rowCount === 0) {
      const safeIdentifier = targetDb.replace(/"/g, '""');
      await adminClient.query(`CREATE DATABASE "${safeIdentifier}"`);
    }
  } finally {
    await adminClient.end().catch(() => undefined);
  }
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await database.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabaseSchema(): Promise<void> {
  await ensureDatabaseExists();

  const initSqlPath = path.resolve(__dirname, "../../database/init.sql");
  const initSql = fs.readFileSync(initSqlPath, "utf8");

  await database.query(initSql);

  for (const role of Object.values(ROLE_CONFIGS)) {
    await database.query(
      `INSERT INTO roles (key, name, team, description, ability, objective, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         team = EXCLUDED.team,
         description = EXCLUDED.description,
         ability = EXCLUDED.ability,
         objective = EXCLUDED.objective`,
      [
        role.key,
        role.name,
        role.team,
        role.description,
        role.ability,
        role.objective
      ]
    );
  }

  await database.query(
    `INSERT INTO schema_migrations (version)
     VALUES ($1)
     ON CONFLICT (version) DO NOTHING`,
    ["001_initial_schema"]
  );
}
