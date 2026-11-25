import type { ElectronicDocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { padCodigo, padNumero } from "./security";

/**
 * Correlativo atómico por tipo de documento, establecimiento y punto.
 * Se usa INSERT ... ON CONFLICT para no repetir números con varias peticiones.
 */
export async function siguienteNumero(
  kind: ElectronicDocumentKind,
  establecimiento: string,
  punto: string,
): Promise<string> {
  const key = `${kind}:${padCodigo(establecimiento)}:${padCodigo(punto)}`;
  const filas = await prisma.$queryRaw<Array<{ next_number: number }>>`
    INSERT INTO "DocumentSequence" ("key", "nextNumber", "updatedAt")
    VALUES (${key}, 2, NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "nextNumber" = "DocumentSequence"."nextNumber" + 1, "updatedAt" = NOW()
    RETURNING "nextNumber" AS next_number
  `;
  const numero = filas[0]?.next_number;
  if (!numero) throw new Error("No se pudo obtener el correlativo del documento");
  return padNumero(numero);
}
