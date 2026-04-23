interface ReplicaKeywordBarProps {
  keyword: string;
  isUpdating: boolean;
  statusMessage: string;
  onKeywordChange: (value: string) => void;
  onUpdate: () => void;
  onToggleHistory: () => void;
}

export function ReplicaKeywordBar({
  keyword,
  isUpdating,
  statusMessage,
  onKeywordChange,
  onUpdate,
  onToggleHistory
}: ReplicaKeywordBarProps) {
  return (
    <div className="replica-shell__keyword-block">
      <div className="replica-shell__keyword-shell">
        <div className="replica-shell__keyword-panel">
          <div className="replica-shell__keyword-card">
            <label className="replica-shell__keyword-label" htmlFor="replica-keyword-input">
              选择关键词
            </label>
            <input
              id="replica-keyword-input"
              className="replica-shell__keyword-input"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onUpdate();
                }
              }}
            />
          </div>

          <div className="replica-shell__keyword-track">
            <span>根据关键词抓取跨平台内容，结果区会明确区分接口原始顺序与页面展示顺序。</span>
          </div>
        </div>

        <div className="replica-shell__keyword-actions">
          <div className="replica-shell__history-wrap">
            <button
              className="replica-shell__history-button replica-shell__action-button replica-shell__action-button--secondary"
              type="button"
              aria-label="打开搜索历史"
              onClick={(event) => {
                event.stopPropagation();
                onToggleHistory();
              }}
            >
              搜索历史
            </button>
          </div>

          <button
            className="replica-shell__update-button replica-shell__action-button replica-shell__action-button--primary"
            type="button"
            disabled={isUpdating}
            aria-label="一键更新"
            onClick={onUpdate}
          >
            <span aria-hidden="true">{isUpdating ? "…" : "↻"}</span>
            <span>{isUpdating ? "更新中" : "一键更新"}</span>
          </button>
        </div>
      </div>

      {statusMessage ? <p className="replica-shell__status-message">{statusMessage}</p> : null}
    </div>
  );
}

export default ReplicaKeywordBar;
