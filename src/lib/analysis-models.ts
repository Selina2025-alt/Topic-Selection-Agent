export const LEGACY_SILICONFLOW_MODEL = "zai-org/GLM-5";
export const DEFAULT_SILICONFLOW_MODEL = "Pro/zai-org/GLM-5";

export function normalizeSiliconFlowModel(model?: string | null) {
  const trimmed = model?.trim();

  if (!trimmed || trimmed === LEGACY_SILICONFLOW_MODEL) {
    return DEFAULT_SILICONFLOW_MODEL;
  }

  return trimmed;
}
