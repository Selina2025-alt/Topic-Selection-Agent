// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultSiliconFlowClient,
  createSiliconFlowClient
} from "@/lib/siliconflow-client";

describe("siliconflow client", () => {
  afterEach(() => {
    delete process.env.SILICONFLOW_API_KEY;
    delete process.env.SILICONFLOW_BASE_URL;
    delete process.env.SILICONFLOW_MODEL;
    vi.restoreAllMocks();
  });

  it("sends an OpenAI-compatible chat/completions request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });

    const client = createSiliconFlowClient({
      apiKey: "test-key",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "zai-org/GLM-5",
      fetchImpl: fetchMock as typeof fetch
    });

    await client.completeJson({ system: "sys", user: "usr" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.cn/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("uses Pro/zai-org/GLM-5 as the default model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });

    process.env.SILICONFLOW_API_KEY = "test-key";
    vi.stubGlobal("fetch", fetchMock);

    const client = createDefaultSiliconFlowClient();

    await client.completeJson({ system: "sys", user: "usr" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.cn/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining("\"model\":\"Pro/zai-org/GLM-5\"")
      })
    );
  });

  it("normalizes the legacy zai-org/GLM-5 model value to the accessible Pro variant", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });

    process.env.SILICONFLOW_API_KEY = "test-key";
    process.env.SILICONFLOW_MODEL = "zai-org/GLM-5";
    vi.stubGlobal("fetch", fetchMock);

    const client = createDefaultSiliconFlowClient();

    await client.completeJson({ system: "sys", user: "usr" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.cn/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining("\"model\":\"Pro/zai-org/GLM-5\"")
      })
    );
  });
});
