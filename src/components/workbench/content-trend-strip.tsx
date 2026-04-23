interface ContentTrendItem {
  date: string;
  contentCount: number;
  hotCount: number;
  leadPlatformLabel: string;
}

interface ContentTrendStripProps {
  items: ContentTrendItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function ContentTrendStrip({
  items,
  selectedDate,
  onSelectDate
}: ContentTrendStripProps) {
  return (
    <section className="workbench-shell__trend-strip" role="region" aria-label="内容趋势导航">
      {items.map((item) => {
        const isSelected = item.date === selectedDate;

        return (
          <button
            key={item.date}
            type="button"
            className={
              isSelected
                ? "workbench-shell__date-card workbench-shell__date-card--trend is-active"
                : "workbench-shell__date-card workbench-shell__date-card--trend"
            }
            aria-pressed={isSelected}
            onClick={() => onSelectDate(item.date)}
          >
            <span>{item.date}</span>
            <strong>{`${item.contentCount} 条内容`}</strong>
            <small>{`${item.hotCount} 条热点 · ${item.leadPlatformLabel}`}</small>
          </button>
        );
      })}
    </section>
  );
}

export default ContentTrendStrip;
