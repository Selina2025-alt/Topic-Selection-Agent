import type { SearchHistoryEntry } from "@/lib/search-history";

interface ReplicaHistoryPopoverProps {
  history: SearchHistoryEntry[];
  onSelectHistory: (entry: SearchHistoryEntry) => void;
}

export function ReplicaHistoryPopover({
  history,
  onSelectHistory
}: ReplicaHistoryPopoverProps) {
  return (
    <div className="replica-shell__history-popover" onClick={(event) => event.stopPropagation()}>
      <div className="replica-shell__history-head">
        <strong>搜索历史</strong>
        <span>最近 12 条</span>
      </div>

      {history.length > 0 ? (
        <div className="replica-shell__history-list">
          {history.map((entry) => (
            <button
              key={entry.id}
              className="replica-shell__history-item"
              type="button"
              onClick={() => onSelectHistory(entry)}
            >
              <strong>{entry.keyword}</strong>
              <span>{entry.categoryName}</span>
              <small>{entry.searchedAt}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="replica-shell__history-empty">暂无搜索历史</div>
      )}
    </div>
  );
}

export default ReplicaHistoryPopover;
