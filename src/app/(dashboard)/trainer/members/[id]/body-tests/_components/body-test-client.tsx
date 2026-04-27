'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/shared/section-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

type Protocol = '3site' | '7site' | '9site' | 'other';
type Sex = 'male' | 'female';

export interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: Protocol;
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

interface Props {
  memberId: string;
  memberName?: string;
  initialTests: BodyTestRecord[];
}

const PROTOCOL_LABELS: Record<Protocol, string> = {
  '3site': '3-Site (Jackson-Pollock)',
  '7site': '7-Site (Jackson-Pollock)',
  '9site': '9-Site (Parillo)',
  other: 'Other (manual entry)',
};

function getRequiredSites(protocol: Protocol, sex: Sex): string[] {
  if (protocol === '3site' && sex === 'male') return ['chest', 'abdominal', 'thigh'];
  if (protocol === '3site' && sex === 'female') return ['tricep', 'suprailiac', 'thigh'];
  if (protocol === '7site') return ['chest', 'midaxillary', 'tricep', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
  if (protocol === '9site') return ['tricep', 'chest', 'subscapular', 'abdominal', 'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar'];
  return [];
}

const SITE_LABELS: Record<string, string> = {
  chest: 'Chest',
  abdominal: 'Abdominal',
  thigh: 'Thigh',
  tricep: 'Tricep',
  suprailiac: 'Suprailiac',
  subscapular: 'Subscapular',
  midaxillary: 'Midaxillary',
  bicep: 'Bicep',
  lumbar: 'Lumbar',
};

export function BodyTestClient({ memberId, memberName, initialTests }: Props) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [protocol, setProtocol] = useState<Protocol>('other');
  const [sex, setSex] = useState<Sex>('male');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [sites, setSites] = useState<Record<string, string>>({});
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState('');
  const [saving, setSaving] = useState(false);

  const requiredSites = getRequiredSites(protocol, sex);

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: Record<string, number | string | null> = {
        protocol,
        sex,
        weight: parseFloat(weight),
        age: parseInt(age),
        date: new Date(date).toISOString(),
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        targetBodyFatPct: targetBodyFatPct ? parseFloat(targetBodyFatPct) : null,
      };
      if (protocol === 'other') {
        payload.bodyFatPct = parseFloat(bodyFatPct);
      } else {
        requiredSites.forEach((site) => {
          payload[site] = parseFloat(sites[site] ?? '0');
        });
      }
      const res = await fetch(`/api/members/${memberId}/body-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save body test');
        return;
      }
      const created = (await res.json()) as BodyTestRecord;
      setTests((prev) => [created, ...prev]);
      toast.success('Body test saved');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(testId: string) {
    try {
      const res = await fetch(`/api/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to delete test');
        return;
      }
      setTests((prev) => prev.filter((t) => t._id !== testId));
      toast.success('Body test deleted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={memberName ? `${memberName}'s Body Tests` : 'Body Tests'} />

      <section className="px-4 sm:px-8">
        <SectionHeader title="New Body Test" />
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 mt-3 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="date"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Test Date
              </label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="protocol"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Protocol
              </label>
              <select
                id="protocol"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as Protocol)}
                className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
              >
                {(Object.entries(PROTOCOL_LABELS) as [Protocol, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="age"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Age
              </label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="years"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">Sex</p>
              <div className="flex gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-[#888]">
                  <input
                    type="radio"
                    name="sex"
                    value="male"
                    checked={sex === 'male'}
                    onChange={() => setSex('male')}
                    className="accent-white"
                  />
                  Male
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-[#888]">
                  <input
                    type="radio"
                    name="sex"
                    value="female"
                    checked={sex === 'female'}
                    onChange={() => setSex('female')}
                    className="accent-white"
                  />
                  Female
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="weight"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Weight (kg)
              </label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
          </div>

          {protocol === 'other' ? (
            <div className="space-y-1.5">
              <label
                htmlFor="bodyFatPct"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Body Fat (%)
              </label>
              <Input
                id="bodyFatPct"
                type="number"
                step="0.1"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                placeholder="%"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {requiredSites.map((site) => (
                <div key={site} className="space-y-1.5">
                  <label
                    htmlFor={site}
                    className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
                  >
                    {SITE_LABELS[site]} (mm)
                  </label>
                  <Input
                    id={site}
                    type="number"
                    step="0.1"
                    value={sites[site] ?? ''}
                    onChange={(e) => setSites((prev) => ({ ...prev, [site]: e.target.value }))}
                    placeholder="mm"
                    className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="targetWeight"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Target Weight (kg, optional)
              </label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="kg"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="targetBodyFatPct"
                className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]"
              >
                Target Body Fat (%, optional)
              </label>
              <Input
                id="targetBodyFatPct"
                type="number"
                step="0.1"
                value={targetBodyFatPct}
                onChange={(e) => setTargetBodyFatPct(e.target.value)}
                placeholder="%"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Card>
      </section>

      <section className="px-4 sm:px-8">
        <SectionHeader title="Test History" />
        {tests.length === 0 ? (
          <EmptyState
            heading="No body tests yet"
            description="Record the first body test for this member."
          />
        ) : (
          <div className="space-y-3 mt-3">
            {tests.map((t) => (
              <Card
                key={t._id}
                className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex items-start justify-between"
              >
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    <time dateTime={t.date}>
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </time>
                  </p>
                  <p className="text-[12px] text-[#555] mt-1">
                    Weight {t.weight} kg · Body Fat {t.bodyFatPct.toFixed(1)}%
                  </p>
                  <p className="text-[12px] text-[#555]">
                    Lean Mass {t.leanMassKg.toFixed(1)} kg · Fat Mass {t.fatMassKg.toFixed(1)} kg
                  </p>
                  {(t.targetWeight ?? t.targetBodyFatPct) && (
                    <p className="text-[11px] text-[#333] mt-1">
                      Goal: {t.targetWeight ? `Weight ${t.targetWeight} kg` : ''}
                      {t.targetBodyFatPct ? ` Body Fat ${t.targetBodyFatPct}%` : ''}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(t._id)}
                  className="text-[#333] hover:text-red-400 hover:bg-[#141414] text-xs ml-4"
                >
                  Delete
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
