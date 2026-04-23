import { NextRequest, NextResponse } from "next/server";

import { searchWechatArticlesByKeyword } from "@/lib/wechat-monitor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const period = Number.parseInt(searchParams.get("period") ?? "7", 10);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required", items: [] }, { status: 400 });
  }

  try {
    const items = await searchWechatArticlesByKeyword(keyword, page, period);

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message, items: [] }, { status: 502 });
  }
}
