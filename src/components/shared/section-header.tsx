import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  tooltip?: string;
}

export function SectionHeader({ title, action, onAction, tooltip }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger className="cursor-default text-foreground/35 hover:text-foreground/60 transition-colors">
              <Info className="size-3.5" aria-label={`About ${title}`} />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="start"
              className="max-w-[260px] leading-relaxed whitespace-normal"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
