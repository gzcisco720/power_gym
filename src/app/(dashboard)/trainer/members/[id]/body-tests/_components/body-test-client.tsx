'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  initialTests: BodyTestRecord[];
}

const PROTOCOL_LABELS: Record<Protocol, string> = {
  '3site': '3点法 (Jackson-Pollock)',
  '7site': '7点法 (Jackson-Pollock)',
  '9site': '9点法 (Parrillo)',
  other: '直接输入体脂率',
};

function getRequiredSites(protocol: Protocol, sex: Sex): string[] {
  if (protocol === '3site' && sex === 'male') return ['chest', 'abdominal', 'thigh'];
  if (protocol === '3site' && sex === 'female') return ['tricep', 'suprailiac', 'thigh'];
  if (protocol === '7site') return ['chest', 'midaxillary', 'tricep', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
  if (protocol === '9site') return ['tricep', 'chest', 'subscapular', 'abdominal', 'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar'];
  return [];
}

const SITE_LABELS: Record<string, string> = {
  chest: '胸部',
  abdominal: '腹部',
  thigh: '大腿',
  tricep: '三头肌',
  suprailiac: '髂骨上',
  subscapular: '肩胛下',
  midaxillary: '腋中线',
  bicep: '二头肌',
  lumbar: '腰部',
};

export function BodyTestClient({ memberId, initialTests }: Props) {
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
      if (res.ok) {
        const created = (await res.json()) as BodyTestRecord;
        setTests((prev) => [created, ...prev]);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(testId: string) {
    const res = await fetch(`/api/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });
    if (res.ok) {
      setTests((prev) => prev.filter((t) => t._id !== testId));
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">新建体测</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">测试日期</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="protocol" className="block text-sm font-medium mb-1">测量协议</label>
              <select
                id="protocol"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as Protocol)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {(Object.entries(PROTOCOL_LABELS) as [Protocol, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium mb-1">年龄</label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="岁"
              />
            </div>
            <div>
              <p className="block text-sm font-medium mb-1">性别</p>
              <div className="flex gap-3 pt-1">
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="sex"
                    value="male"
                    checked={sex === 'male'}
                    onChange={() => setSex('male')}
                  />
                  男
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="sex"
                    value="female"
                    checked={sex === 'female'}
                    onChange={() => setSex('female')}
                  />
                  女
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="weight" className="block text-sm font-medium mb-1">体重 (kg)</label>
              <input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="kg"
              />
            </div>
          </div>

          {protocol === 'other' ? (
            <div>
              <label htmlFor="bodyFatPct" className="block text-sm font-medium mb-1">体脂率 (%)</label>
              <input
                id="bodyFatPct"
                type="number"
                step="0.1"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="%"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {requiredSites.map((site) => (
                <div key={site}>
                  <label htmlFor={site} className="block text-sm font-medium mb-1">
                    {SITE_LABELS[site]} (mm)
                  </label>
                  <input
                    id={site}
                    type="number"
                    step="0.1"
                    value={sites[site] ?? ''}
                    onChange={(e) => setSites((prev) => ({ ...prev, [site]: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="mm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetWeight" className="block text-sm font-medium mb-1">目标体重 (kg, 可选)</label>
              <input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="kg"
              />
            </div>
            <div>
              <label htmlFor="targetBodyFatPct" className="block text-sm font-medium mb-1">目标体脂 (%, 可选)</label>
              <input
                id="targetBodyFatPct"
                type="number"
                step="0.1"
                value={targetBodyFatPct}
                onChange={(e) => setTargetBodyFatPct(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="%"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">体测记录</h2>
        {tests.length === 0 ? (
          <p className="text-muted-foreground">暂无体测记录</p>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => (
              <div key={t._id} className="rounded-lg border p-4 flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    <time dateTime={t.date}>
                      {new Date(t.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                    </time>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    体重 {t.weight} kg · 体脂率 {t.bodyFatPct.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    瘦体重 {t.leanMassKg.toFixed(1)} kg · 脂肪量 {t.fatMassKg.toFixed(1)} kg
                  </p>
                  {(t.targetWeight ?? t.targetBodyFatPct) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      目标: {t.targetWeight ? `体重 ${t.targetWeight} kg` : ''}
                      {t.targetBodyFatPct ? ` 体脂率 ${t.targetBodyFatPct}%` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(t._id)}
                  className="text-sm text-destructive hover:underline ml-4"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
