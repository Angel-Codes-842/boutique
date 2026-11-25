import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const prismaCli = "node_modules/.bin/prisma";

function runPrisma(args) {
  const result = spawnSync(prismaCli, args, { stdio: "inherit" });
  if (result.error) {
    throw new Error(`No se pudo iniciar Prisma: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Falló Prisma: ${args.join(" ")}`);
  }
}

async function baselineExistingDatabase() {
  const [tables] = await prisma.$queryRaw`
    SELECT
      to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable",
      to_regclass('public."User"') IS NOT NULL AS "hasUserTable"
  `;

  if (!tables.hasUserTable) return;

  const hasAppliedMigrations = tables.hasMigrationTable
    ? (await prisma.$queryRaw`
        SELECT EXISTS (SELECT 1 FROM "_prisma_migrations") AS "applied"
      `)[0].applied
    : false;
  if (hasAppliedMigrations) return;

  const diff = spawnSync(
    prismaCli,
    [
      "migrate",
      "diff",
      "--from-url",
      process.env.DIRECT_URL || process.env.DATABASE_URL,
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8" },
  );
  if (diff.error || diff.status !== 0) {
    throw new Error("No se pudo verificar el esquema existente; no se aplicaron migraciones.");
  }
  if (diff.stdout.trim() !== "-- This is an empty migration.") {
    process.stderr.write(diff.stdout);
    throw new Error(
      "La base existente difiere del esquema actual. Haga un backup y revise la migración antes de continuar.",
    );
  }

  // El esquema existente ya coincide con el modelo actual: registrar TODAS
  // las migraciones como aplicadas para que `migrate deploy` no intente
  // recrear tablas que ya existen (evita P3005).
  const appliedMigrations = readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  for (const migration of appliedMigrations) {
    runPrisma(["migrate", "resolve", "--applied", migration]);
  }
}

async function main() {
  await baselineExistingDatabase();
  runPrisma(["migrate", "deploy"]);
}

main()
  .catch((error) => {
    console.error("No se pudieron preparar las migraciones:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
