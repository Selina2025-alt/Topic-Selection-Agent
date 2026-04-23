import {
  DEFAULT_SILICONFLOW_MODEL,
  normalizeSiliconFlowModel
} from "@/lib/analysis-models";

interface SiliconFlowClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
}

interface CompletionInput {
  system: string;
  user: string;
}

export function createSiliconFlowClient(input: SiliconFlowClientOptions) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.baseUrl.replace(/\/$/, "");

  return {
    async completeJson(messages: CompletionInput) {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user }
          ]
        })
      });

      if (!response.ok) {
        let errorDetail = "";

        try {
          const errorPayload = (await response.json()) as {
            message?: string;
            error?: { message?: string };
          };
          errorDetail = errorPayload.error?.message ?? errorPayload.message ?? "";
        } catch {
          // Keep the status-only fallback when the error body is not JSON.
        }

        throw new Error(
          errorDetail
            ? `SiliconFlow request failed with status ${response.status}: ${errorDetail}`
            : `SiliconFlow request failed with status ${response.status}`
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("SiliconFlow response missing message content");
      }

      return JSON.parse(content) as unknown;
    }
  };
}

export function createDefaultSiliconFlowClient() {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error("Missing SILICONFLOW_API_KEY");
  }

  return createSiliconFlowClient({
    apiKey,
    baseUrl: process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1",
    model: normalizeSiliconFlowModel(process.env.SILICONFLOW_MODEL ?? DEFAULT_SILICONFLOW_MODEL)
  });
}
