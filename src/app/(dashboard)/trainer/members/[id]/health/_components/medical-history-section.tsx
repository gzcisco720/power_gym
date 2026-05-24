'use client';

import type { SerializedMedicalHistory } from '../page';

interface Props {
  history: SerializedMedicalHistory;
}

const PREGNANCY_LABELS: Record<string, string> = {
  'n/a': 'N/A',
  not_pregnant: 'Not pregnant',
  pregnant: 'Pregnant',
  postpartum: 'Postpartum',
};

function GridField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-0.5">
        {label}
      </p>
      {value ? (
        <p className="text-sm text-foreground">{value}</p>
      ) : (
        <p className="text-sm text-foreground/40">–</p>
      )}
    </div>
  );
}

export function MedicalHistorySection({ history }: Props) {
  return (
    <section className="px-4 sm:px-8 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Medical History</h2>
        <span className="text-[10px] text-foreground/40 bg-muted rounded px-1.5 py-0.5">
          Member-managed
        </span>
      </div>

      {!history ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No medical history recorded.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-4">
          <GridField
            label="Chronic Conditions"
            value={
              history.chronicConditions.length > 0
                ? history.chronicConditions.join(', ')
                : null
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GridField label="Surgeries" value={history.surgeries} />
            <GridField label="Allergies" value={history.allergies} />
            <GridField label="Family History" value={history.familyHistory} />
            <GridField label="Doctor" value={history.currentDoctor} />
            <GridField label="Emergency Contact" value={history.emergencyContact} />
            <GridField
              label="Pregnancy Status"
              value={
                history.pregnancyStatus
                  ? (PREGNANCY_LABELS[history.pregnancyStatus] ?? history.pregnancyStatus)
                  : null
              }
            />
          </div>
          <p className="text-[11px] text-foreground/40">
            Last updated{' '}
            {new Date(history.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </section>
  );
}
