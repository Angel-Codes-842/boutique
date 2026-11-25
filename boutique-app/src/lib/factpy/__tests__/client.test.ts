import { afterEach, describe, expect, it, vi } from "vitest";
import {
  descargarArchivoFactpy,
  emitirDocumentoFactpy,
  FactpyApiError,
  FactpyDisabledError,
  FactpyNotConfiguredError,
  FactpyResponseError,
} from "../client";
import { esUrlFactpySegura, getFactpyPublicStatus } from "../config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function respuestaJson(datos: unknown, ok = true) {
  return {
    ok,
    text: async () => JSON.stringify(datos),
  } as unknown as Response;
}

describe("cliente FACTPY", () => {
  it("no hace llamadas cuando la integración está desactivada", async () => {
    vi.stubEnv("FACTPY_ENABLED", "false");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(emitirDocumentoFactpy({ prueba: true })).rejects.toBeInstanceOf(FactpyDisabledError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exige recordID cuando se habilita", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(emitirDocumentoFactpy({ prueba: true })).rejects.toBeInstanceOf(FactpyNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envía dataJson y recordID por multipart al endpoint de documentos", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    const fetchMock = vi.fn().mockResolvedValue(
      respuestaJson({
        status: true,
        recordID: "otro-secreto",
        cdc: "CDC-123",
        cdcSpace: "CDC-123 ",
        link: "https://api.factpy.com/kude",
        code: "Aprobado",
        xmlLink: "https://api.factpy.com/xml",
        kude: "https://api.factpy.com/kude",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await emitirDocumentoFactpy({ receiptid: "REC-1" });

    expect(resultado.cdc).toBe("CDC-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.factpy.com/facturacion-api/data.php");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("recordID")).toBe("secreto-local");
    expect(JSON.parse(String(form.get("dataJson")))).toEqual({ receiptid: "REC-1" });
  });

  it("convierte el status:false de FACTPY en FactpyApiError", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaJson({ status: false, code: "CDC duplicado" })),
    );

    const promesa = emitirDocumentoFactpy({});
    await expect(promesa).rejects.toBeInstanceOf(FactpyApiError);
    await expect(promesa).rejects.toThrow("CDC duplicado");
  });

  it("rechaza respuestas que no son JSON", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "<html>error</html>" } as Response),
    );

    const promesa = emitirDocumentoFactpy({});
    await expect(promesa).rejects.toBeInstanceOf(FactpyResponseError);
    await expect(promesa).rejects.not.toBeInstanceOf(FactpyApiError);
  });

  it("nunca expone recordID en el estado público", () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    vi.stubEnv("FACTPY_ENVIRONMENT", "production");

    const estado = getFactpyPublicStatus();
    expect(estado).toEqual({
      enabled: true,
      configured: true,
      environment: "production",
      apiUrl: "https://api.factpy.com",
      available: true,
    });
    expect(JSON.stringify(estado)).not.toContain("secreto-local");
    expect(JSON.stringify(estado)).not.toContain("recordID");
  });

  it("solo permite descargar archivos del host configurado", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(esUrlFactpySegura("https://api.factpy.com/kude/123")).toBe(true);
    expect(esUrlFactpySegura("api.factpy.com/kude/123")).toBe(true);
    expect(esUrlFactpySegura("http://api.factpy.com/kude/123")).toBe(false);
    expect(esUrlFactpySegura("https://ejemplo.com/kude/123")).toBe(false);

    await expect(descargarArchivoFactpy("https://ejemplo.com/x")).rejects.toThrow("URL no permitida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("descarga archivos como ArrayBuffer", async () => {
    vi.stubEnv("FACTPY_ENABLED", "true");
    vi.stubEnv("FACTPY_RECORD_ID", "secreto-local");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: { get: () => "application/pdf" },
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const archivo = await descargarArchivoFactpy("api.factpy.com/kude/123");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.factpy.com/kude/123");
    expect(archivo.body.byteLength).toBe(8);
    expect(archivo.contentType).toBe("application/pdf");
  });
});
