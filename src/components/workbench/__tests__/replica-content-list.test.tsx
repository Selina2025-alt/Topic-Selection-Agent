import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReplicaContentList } from "@/components/workbench/replica-content-list";
import type { ReplicaArticle } from "@/lib/replica-workbench-data";

function createArticle(input: Partial<ReplicaArticle> & Pick<ReplicaArticle, "id" | "title">): ReplicaArticle {
  return {
    id: input.id,
    platformId: input.platformId ?? "wechat",
    platformLabel: input.platformLabel ?? "公众号",
    author: input.author ?? "测试作者",
    title: input.title,
    excerpt: input.excerpt ?? "这是一条用于测试排序和展示结构的摘要。",
    publishedAt: input.publishedAt ?? "2026-04-01 10:00:00",
    publishTimestamp: input.publishTimestamp ?? 1_775_000_000,
    heat: input.heat ?? 80,
    likes: input.likes ?? 100,
    comments: input.comments ?? 20,
    reads: input.reads ?? "3000",
    articleUrl: input.articleUrl ?? "https://example.com/article",
    sourceUrl: input.sourceUrl ?? "https://example.com/article",
    source: input.source ?? "api",
    sourceType: input.sourceType ?? "wechat",
    tag: input.tag ?? "claude code",
    rawOrderIndex: input.rawOrderIndex
  };
}

describe("replica content list", () => {
  it("renders cards sorted by likes and shows sort note plus heat blocks", () => {
    const lowLikeArticle = createArticle({
      id: "a-low",
      title: "点赞较低的文章",
      likes: 12,
      comments: 2,
      heat: 64
    });
    const highLikeArticle = createArticle({
      id: "a-high",
      title: "点赞较高的文章",
      likes: 320,
      comments: 18,
      heat: 91,
      publishTimestamp: 1_775_010_000
    });

    const { container } = render(
      <ReplicaContentList
        keyword="claude code"
        articles={[lowLikeArticle, highLikeArticle]}
        activePlatformId="wechat"
        selectedCardId=""
        isLoading={false}
        errorMessage=""
        isApiSource
        onSelectCard={() => {}}
      />
    );

    expect(screen.getByText("按点赞数排序 · 真实数据")).toBeInTheDocument();
    expect(screen.getAllByText("热度")).toHaveLength(2);
    expect(screen.getByText("点赞 320")).toBeInTheDocument();

    const titles = Array.from(container.querySelectorAll(".replica-shell__content-title")).map((node) =>
      node.textContent?.trim()
    );

    expect(titles.slice(0, 2)).toEqual(["点赞较高的文章", "点赞较低的文章"]);
  });
});
