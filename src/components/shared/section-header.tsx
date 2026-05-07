interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-foreground/65 hover:text-foreground transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
