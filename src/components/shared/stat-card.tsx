import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
}

export function StatCard({ label, value, unit, delta }: StatCardProps) {
  return (
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
      <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#2e2e2e] mb-2">
        {label}
      </div>
      <div className="text-[26px] font-bold leading-none tracking-[-1px] text-white">
        {value}
        {unit && (
          <span className="text-[11px] font-medium text-[#333] ml-1">{unit}</span>
        )}
      </div>
      {delta && (
        <div className="mt-1.5 text-[10px] text-[#333]">{delta}</div>
      )}
    </Card>
  );
}
