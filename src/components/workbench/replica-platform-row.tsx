import type { ReplicaPlatform, ReplicaPlatformId } from "@/lib/replica-workbench-data";

interface ReplicaPlatformRowProps {
  platforms: ReplicaPlatform[];
  activePlatformId: ReplicaPlatformId;
  onSelectPlatform: (platformId: ReplicaPlatformId) => void;
}

export function ReplicaPlatformRow({
  platforms,
  activePlatformId,
  onSelectPlatform
}: ReplicaPlatformRowProps) {
  return (
    <div className="replica-shell__platform-row">
      {platforms.map((platform) => {
        const isActive = platform.id === activePlatformId;

        return (
          <button
            key={platform.id}
            className={`replica-shell__pill replica-shell__pill--${platform.id} ${
              isActive ? "is-active" : ""
            } ${platform.id === "wechat" ? "is-wechat" : ""}`}
            type="button"
            data-testid={`platform-filter-${platform.id}`}
            aria-label={platform.label}
            onClick={() => onSelectPlatform(platform.id)}
          >
            {platform.icon ? <span className="replica-shell__pill-icon" aria-hidden="true">{platform.icon}</span> : null}
            <span>{platform.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ReplicaPlatformRow;
