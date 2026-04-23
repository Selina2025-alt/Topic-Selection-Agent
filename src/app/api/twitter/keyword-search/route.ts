import { NextRequest, NextResponse } from "next/server";

import { searchTwitterPostsSnapshotByKeyword } from "@/lib/twitter-monitor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword is required", items: [], rawItems: [], meta: null },
      { status: 400 }
    );
  }

  try {
    const snapshot = await searchTwitterPostsSnapshotByKeyword(keyword);

    return NextResponse.json({
      items: snapshot.items,
      rawItems: snapshot.rawItems,
      meta: {
        source: "twitter",
        sortedBy: "publish_time_desc",
        fetchedCount: snapshot.rawItems.length,
        cappedCount: snapshot.items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message, items: [], rawItems: [], meta: null },
      { status: 502 }
    );
  }
}
