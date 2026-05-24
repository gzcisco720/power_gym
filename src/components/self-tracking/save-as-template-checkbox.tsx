'use client';

interface Props {
  value: { name: string; description: string } | null;
  onChange: (next: { name: string; description: string } | null) => void;
}

export function SaveAsTemplateCheckbox({ value, onChange }: Props) {
  const checked = value !== null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) =>
            onChange(e.target.checked ? { name: '', description: '' } : null)
          }
          aria-label="Save as template"
          className="h-4 w-4"
        />
        Save as template
      </label>
      {checked && (
        <div className="space-y-2 pl-6">
          <input
            type="text"
            placeholder="Template name *"
            aria-label="Template name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className="w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            aria-label="Template description"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            className="w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
