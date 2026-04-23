import type { ContentPoolView, ContentRangeId, PlatformId } from "@/lib/types";

interface FilterItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface ContentFilterBarProps {
  platforms: Array<FilterItem<PlatformId>>;
  keywords?: Array<FilterItem<string>>;
  keywordDraft?: string;
  ranges: Array<FilterItem<ContentRangeId>>;
  poolViews: Array<FilterItem<ContentPoolView>>;
  selectedPlatformId: PlatformId;
  selectedKeywordId?: string;
  selectedRangeId: ContentRangeId;
  selectedPoolView: ContentPoolView;
  onKeywordDraftChange?: (value: string) => void;
  onSelectPlatformId: (platformId: PlatformId) => void;
  onSelectKeywordId?: (keywordId: string) => void;
  onSelectRangeId: (rangeId: ContentRangeId) => void;
  onSelectPoolView: (view: ContentPoolView) => void;
  onSubmitKeywordSearch?: () => void;
}

export function ContentFilterBar({
  platforms,
  keywords = [],
  keywordDraft = "",
  ranges,
  poolViews,
  selectedPlatformId,
  selectedKeywordId,
  selectedRangeId,
  selectedPoolView,
  onKeywordDraftChange,
  onSelectPlatformId,
  onSelectKeywordId,
  onSelectRangeId,
  onSelectPoolView,
  onSubmitKeywordSearch
}: ContentFilterBarProps) {
  return (
    <section className="workbench-shell__filter-stack">
      <div className="workbench-shell__filter-group" role="group" aria-label="平台筛选">
        {platforms.map((platform) => {
          const isSelected = platform.id === selectedPlatformId;

          return (
            <button
              key={platform.id}
              type="button"
              className={isSelected ? "workbench-shell__tab is-active" : "workbench-shell__tab"}
              aria-pressed={isSelected}
              onClick={() => onSelectPlatformId(platform.id)}
            >
              {platform.count != null ? `${platform.label} ${platform.count}` : platform.label}
            </button>
          );
        })}
      </div>

      <div className="workbench-shell__filter-row">
        {keywords.length > 0 ? (
          <div
            className="workbench-shell__filter-group workbench-shell__filter-group--keyword"
            role="group"
            aria-label="公众号关键词"
          >
            <form
              className="workbench-shell__keyword-search"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitKeywordSearch?.();
              }}
            >
              <input
                aria-label="公众号关键词输入"
                className="workbench-shell__keyword-input"
                placeholder="输入任意公众号关键词"
                type="text"
                value={keywordDraft}
                onChange={(event) => onKeywordDraftChange?.(event.target.value)}
              />
              <button
                type="submit"
                className="workbench-shell__tab"
                disabled={!keywordDraft.trim()}
              >
                搜索公众号
              </button>
            </form>

            <div className="workbench-shell__filter-group" role="group" aria-label="公众号快捷词">
              {keywords.map((keyword) => {
                const isSelected = keyword.id === selectedKeywordId;

                return (
                  <button
                    key={keyword.id}
                    type="button"
                    className={
                      isSelected ? "workbench-shell__tab is-active" : "workbench-shell__tab"
                    }
                    aria-label={`公众号关键词：${keyword.label}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectKeywordId?.(keyword.id)}
                  >
                    {keyword.count != null ? `${keyword.label} ${keyword.count}` : keyword.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="workbench-shell__filter-group" role="group" aria-label="时间范围">
          {ranges.map((range) => {
            const isSelected = range.id === selectedRangeId;

            return (
              <button
                key={range.id}
                type="button"
                className={isSelected ? "workbench-shell__tab is-active" : "workbench-shell__tab"}
                aria-pressed={isSelected}
                onClick={() => onSelectRangeId(range.id)}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        <div className="workbench-shell__filter-group" role="group" aria-label="内容池筛选">
          {poolViews.map((view) => {
            const isSelected = view.id === selectedPoolView;

            return (
              <button
                key={view.id}
                type="button"
                className={isSelected ? "workbench-shell__tab is-active" : "workbench-shell__tab"}
                aria-pressed={isSelected}
                onClick={() => onSelectPoolView(view.id)}
              >
                {view.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ContentFilterBar;
