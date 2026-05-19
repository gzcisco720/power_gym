'use client';

import { getDrugWarning } from '@/lib/health/drug-warnings';
import type { SerializedMedication } from '../page';

interface Props {
  medications: SerializedMedication[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function MedicationsSection({ medications }: Props) {
  return (
    <section className="px-4 sm:px-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Medications</h2>
        <span className="text-[10px] text-foreground/40 bg-muted rounded px-1.5 py-0.5">
          Member-managed
        </span>
      </div>

      {medications.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
          <p className="text-sm text-foreground/65">
            No medications recorded — the member can add these from their health profile.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {medications.map((med) => {
            const warning = getDrugWarning(med.name);
            return (
              <li
                key={med._id}
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{med.name}</span>
                      {med.status === 'active' ? (
                        <span className="bg-blue-950/50 text-blue-300 text-[10px] rounded-full px-2 py-0.5 shrink-0">
                          {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                        </span>
                      ) : (
                        <span className="bg-muted text-foreground/40 text-[10px] rounded-full px-2 py-0.5 shrink-0">
                          Ended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/65">
                      {med.purpose}
                      {' · Since '}
                      {formatDate(med.startDate)}
                      {med.endDate && ` · Ended ${formatDate(med.endDate)}`}
                    </p>
                    {med.notes && (
                      <p className="mt-1 text-xs text-foreground/65">{med.notes}</p>
                    )}
                    {warning && (
                      <p className="bg-amber-950/40 text-amber-400 text-[11px] rounded-md px-2 py-1 mt-1.5">
                        {warning}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
