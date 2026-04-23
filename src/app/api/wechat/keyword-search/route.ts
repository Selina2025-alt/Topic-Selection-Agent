import { NextRequest, NextResponse } from "next/server";

import { searchWechatArticlesSnapshotByKeyword } from "@/lib/wechat-monitor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const period = Number.parseInt(searchParams.get("period") ?? "7", 10);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword is required", items: [], rawItems: [], meta: null },
      { status: 400 }
    );
  }

  try {
    const snapshot = await searchWechatArticlesSnapshotByKeyword(keyword, page, period);

    return NextResponse.json({
      items: snapshot.items,
      rawItems: snapshot.rawItems,
      page,
      period,
      meta: {
        source: "wechat",
        sortedBy: "publish_time_desc"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message, items: [], rawItems: [], page, period, meta: null },
      { status: 502 }
    );
  }
}
