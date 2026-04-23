import { NextRequest, NextResponse } from "next/server";

import { searchXiaohongshuNotesSnapshotByKeyword } from "@/lib/xiaohongshu-monitor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const noteTime = (searchParams.get("noteTime")?.trim() as "day" | "week" | "month" | null) ?? "day";

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword is required", items: [], rawItems: [], meta: null },
      { status: 400 }
    );
  }

  try {
    const snapshot = await searchXiaohongshuNotesSnapshotByKeyword(keyword, page, noteTime);

    return NextResponse.json({
      items: snapshot.items,
      rawItems: snapshot.rawItems,
      page,
      noteTime,
      meta: {
        source: "xiaohongshu",
        sortedBy: "publish_time_desc"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message, items: [], rawItems: [], page, noteTime, meta: null },
      { status: 502 }
    );
  }
}
