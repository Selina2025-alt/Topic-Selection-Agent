import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica sidebar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a new category from the plus entry point and switches to it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        rawItems: [],
        meta: {
          source: "wechat",
          sortedBy: "publish_time_desc"
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "展开新增分类" }));
    await user.click(screen.getByRole("button", { name: "新增分类" }));

    const input = screen.getByPlaceholderText("输入分类名称或关键词");
    await user.type(input, "OpenClaw 监控");
    await user.keyboard("{Enter}");

    const categoryButton = screen.getByRole("button", { name: /OpenClaw 监控/i });

    expect(categoryButton).toBeInTheDocument();
    expect(categoryButton.className).toContain("is-active");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("shows rename and delete actions from the more menu", async () => {
    const user = userEvent.setup();

    render(<MonitoringWorkbench />);

    await user.click(screen.getAllByRole("button", { name: "更多操作" })[0]!);

    expect(screen.getByRole("menuitem", { name: "重命名分类" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "删除分类" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "取消" })).toBeInTheDocument();
  });
});
