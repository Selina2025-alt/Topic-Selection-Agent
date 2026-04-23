import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica workbench shell", () => {
  it("renders the screenshot-first homepage shell", () => {
    render(<MonitoringWorkbench />);

    expect(screen.getByText("ContentPulse")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /一键更新/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "公众号" })).toBeInTheDocument();
    expect(screen.getByText(/\[claude code\]/i)).toBeInTheDocument();
  });
});
