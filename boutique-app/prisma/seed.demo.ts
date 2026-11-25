import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const adminPass = process.env.DEMO_ADMIN_PASSWORD;
  const cajeroPass = process.env.DEMO_CAJERO_PASSWORD;
  if (!adminPass || !cajeroPass) {
    throw new Error("Set DEMO_ADMIN_PASSWORD and DEMO_CAJERO_PASSWORD env vars before running demo seed");
  }

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { name: "Administrador", username: "admin", password: await hashPassword(adminPass), role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { username: "cajero" },
    update: {},
    create: { name: "Cajero", username: "cajero", password: await hashPassword(cajeroPass), role: "CAJERO" },
  });

  const config = await prisma.storeConfig.findFirst();
  if (!config) {
    await prisma.storeConfig.create({ data: { name: "Boutique Demo", ticketPrefix: "T", ticketNumber: 1 } });
  }
  console.log("Demo seed OK. Change passwords after first login.");
}

main().finally(() => prisma.$disconnect());
