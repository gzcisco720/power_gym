interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[13px] font-semibold text-white">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-[11px] text-[#2a2a2a] hover:text-[#555] transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
