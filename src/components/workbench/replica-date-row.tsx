import type { ReplicaDateOption } from "@/lib/replica-workbench-data";

interface ReplicaDateRowProps {
  dates: ReplicaDateOption[];
  activeDateId: string;
  onSelectDate: (dateId: string) => void;
}

export function ReplicaDateRow({ dates, activeDateId, onSelectDate }: ReplicaDateRowProps) {
  return (
    <div className="replica-shell__date-row">
      {dates.map((item) => (
        <button
          key={item.id}
          className={`replica-shell__date-card ${item.id === activeDateId ? "is-active" : ""}`}
          type="button"
          onClick={() => onSelectDate(item.id)}
        >
          <div className="replica-shell__date-hint">{item.hint}</div>
          <div className="replica-shell__date-day">{item.day}</div>
          <div className="replica-shell__date-week">{item.week}</div>
          <div className="replica-shell__date-dots">
            {item.dots.map((dot, index) => (
              <span key={`${item.id}-${index}`} style={{ background: dot }} />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

export default ReplicaDateRow;
