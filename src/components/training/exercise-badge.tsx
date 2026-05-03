interface Props {
  label: string;
}

export function ExerciseBadge({ label }: Props) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-[#1e1e1e] px-1.5 text-[9px] font-bold tracking-wider text-[#888] shrink-0">
      {label}
    </span>
  );
}
