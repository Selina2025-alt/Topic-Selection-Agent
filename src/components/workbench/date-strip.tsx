import type { ReactNode } from "react";

export interface DateStripItem {
  date: string;
  label: ReactNode;
  detail?: ReactNode;
}

interface DateStripProps {
  items: DateStripItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function DateStrip({
  items,
  selectedDate,
  onSelectDate
}: DateStripProps) {
  return (
    <div className="workbench-shell__date-strip" aria-label="报告日期">
      {items.map((item) => {
        const isSelected = item.date === selectedDate;

        return (
          <button
            key={item.date}
            type="button"
            aria-pressed={isSelected}
            className={
              isSelected
                ? "workbench-shell__date-card is-active"
                : "workbench-shell__date-card"
            }
            onClick={() => onSelectDate(item.date)}
          >
            <span>{item.date}</span>
            <strong>{item.label}</strong>
            {item.detail ? <small>{item.detail}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

export default DateStrip;
