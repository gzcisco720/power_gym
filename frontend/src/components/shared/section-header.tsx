import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  tooltip?: string;
}

export function SectionHeader({ title, action, onAction, tooltip }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="inline-flex items-center cursor-default text-foreground/35 hover:text-foreground/60 transition-colors">
                <Info className="size-3.5" aria-label={`About ${title}`} />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
