import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Type, FunctionCallingConfigMode } from "@google/genai";

// La pasarela (OpenRouter / LLM Gateway) como respaldo de Gemini. Gemini y la red son de mentira.
const gemini = { generateContent: vi.fn() };
vi.mock("@google/genai", async (original) => ({
  ...(await original()),
  GoogleGenAI: class { constructor() { this.models = gemini; } },
}));

const { traducirPeticion, traducirRespuesta, esquemaJson, pasarela } = await import("./pasarelaIA.js");
const { generarConCobertura } = await import("./iaClient.js");

const HERRAMIENTAS = [{
  functionDeclarations: [{
    name: "responder",
    description: "Lo que dice",
    parameters: { type: Type.OBJECT, properties: { texto: { type: Type.STRING } }, required: ["texto"] },
  }],
}];

describe("traducir de Gemini a OpenAI", () => {
  it("pasa el esquema a JSON Schema en minúsculas", () => {
    expect(esquemaJson({ type: Type.OBJECT, properties: { n: { type: Type.NUMBER } } }))
      .toEqual({ type: "object", properties: { n: { type: "number" } } });
  });

  it("arma mensajes, herramientas y obliga a la única permitida", () => {
    const cuerpo = traducirPeticion({
      contents: "hola",
      config: {
        systemInstruction: "Eres Tiqui",
        tools: HERRAMIENTAS,
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ["responder"] } },
        temperature: 0.3,
      },
    }, ["a:free", "b:free"]);
    expect(cuerpo.messages).toEqual([{ role: "system", content: "Eres Tiqui" }, { role: "user", content: "hola" }]);
    expect(cuerpo.models).toEqual(["a:free", "b:free"]);
    expect(cuerpo.tools[0].function.parameters.type).toBe("object");
    expect(cuerpo.tool_choice).toEqual({ type: "function", function: { name: "responder" } });
  });

  it("devuelve la respuesta con la forma de Gemini", () => {
    const r = traducirRespuesta({
      model: "a:free",
      choices: [{ message: { content: null, tool_calls: [{ function: { name: "responder", arguments: '{"texto":"hola"}' } }] } }],
    });
    expect(r.functionCalls).toEqual([{ name: "responder", args: { texto: "hola" } }]);
    expect(r.text).toBe("");
  });
});

describe("respaldo cuando Gemini se satura", () => {
  const fetchOriginal = globalThis.fetch;
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "prueba";
    gemini.generateContent.mockReset();
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("sin llave de OpenRouter no hay pasarela", () => {
    expect(pasarela()).toBeNull();
  });

  it("si los tres de Gemini fallan, contesta OpenRouter", async () => {
    process.env.OPENROUTER_API_KEY = "llave";
    gemini.generateContent.mockRejectedValue(Object.assign(new Error("503"), { status: 503 }));
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ model: "x:free", choices: [{ message: { tool_calls: [{ function: { name: "responder", arguments: '{"texto":"¡Hola!"}' } }] } }] }),
    }));
    const r = await generarConCobertura({ contents: "hola", config: { tools: HERRAMIENTAS } }, { cobertura: 10, plazoTotal: 3000 });
    expect(gemini.generateContent).toHaveBeenCalledTimes(3);
    expect(r.functionCalls[0].args.texto).toBe("¡Hola!");
    expect(globalThis.fetch.mock.calls[0][0]).toContain("openrouter.ai");
  });
});
