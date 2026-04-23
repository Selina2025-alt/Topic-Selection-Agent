import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica settings panel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders global analysis settings and allows saving them", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/analysis/settings") {
        return {
          ok: true,
          json: async () => ({
            settings: {
              enabled: true,
              time: "08:00",
              provider: "SiliconFlow",
              model: "Pro/zai-org/GLM-5"
            }
          })
        };
      }

      if (url === "/api/content/refresh") {
        return {
          ok: true,
          json: async () => ({
            items: [],
            rawItems: [],
            meta: {
              source: "xiaohongshu",
              sortedBy: "publish_time_desc",
              persisted: true
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({})
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "监控设置" }));

    expect(screen.getByText("全局分析设置")).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();

    const timeInput = screen.getByDisplayValue("08:00");
    await user.clear(timeInput);
    await user.type(timeInput, "09:30");
    await user.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analysis/settings",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
  });
});
