'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';

interface TemplateOption {
  _id: string;
  name: string;
}

interface Props {
  memberId: string;
  templates: TemplateOption[];
  basePathPrefix: 'trainer' | 'owner';
}

export function TrainerMemberNutritionClient({ memberId, templates, basePathPrefix }: Props): JSX.Element {
  const [active, setActive] = useState<IMemberNutritionPlan | null>(null);
  const [history, setHistory] = useState<IMemberNutritionPlan[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch(`/api/members/${memberId}/nutrition`).then((r) => r.json()),
      fetch(`/api/members/${memberId}/nutrition/history`).then((r) => r.json()),
    ]).then(([a, h]: [IMemberNutritionPlan | null, IMemberNutritionPlan[]]) => {
      if (cancelled) return;
      setActive(a);
      setHistory(h);
    });
    return () => { cancelled = true; };
  }, [memberId]);

  async function assignTemplate(): Promise<void> {
    if (!pickedTemplate) return;
    const res = await fetch(`/api/members/${memberId}/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: pickedTemplate }),
    });
    if (res.ok) {
      const next = (await res.json()) as IMemberNutritionPlan;
      setActive(next);
      setHistory((h) => [next, ...h]);
      setAssignOpen(false);
    }
  }

  return (
    <Tabs defaultValue="current" className="space-y-4">
      <TabsList>
        <TabsTrigger value="current">Current Plan</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
      </TabsList>

      <TabsContent value="current">
        {!active ? (
          <Card className="p-6 text-center text-muted-foreground">
            No active plan.
            <div className="mt-3"><Button size="sm" onClick={() => setAssignOpen(true)}>Assign Plan</Button></div>
          </Card>
        ) : (
          <Card className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{active.name} · {active.dayTypes.length} day types · Assigned {new Date(active.assignedAt).toISOString().slice(0, 10)}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAssignOpen(true)}>From Template</Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/${basePathPrefix}/members/${memberId}/nutrition/new`}>Create Direct</Link>
                </Button>
              </div>
            </div>
            <ul className="divide-y text-sm">
              {active.dayTypes.map((d) => (
                <li key={d.name} className="py-1.5 flex justify-between">
                  <span>{d.name}</span>
                  <span className="text-muted-foreground">{d.targetKcal} kcal · {d.targetProtein}P · {d.targetCarbs}C · {d.targetFat}F</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="history">
        <Card className="p-3">
          <ul className="divide-y text-sm">
            {history.map((p) => (
              <li key={String(p._id)} className="py-1.5 flex justify-between">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {new Date(p.assignedAt).toISOString().slice(0, 10)} · {p.dayTypes.length} day types · {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
            {!history.length && <li className="py-2 text-muted-foreground text-center">No history.</li>}
          </ul>
        </Card>
      </TabsContent>

      <TabsContent value="schedule">
        {!active ? (
          <Card className="p-6 text-center text-muted-foreground">Assign a plan first to set a schedule.</Card>
        ) : (
          <ScheduleEditor
            memberId={memberId}
            dayTypeNames={active.dayTypes.map((d) => d.name)}
            initialSchedule={active.schedule}
          />
        )}
      </TabsContent>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Template</DialogTitle></DialogHeader>
          <Select value={pickedTemplate} onValueChange={setPickedTemplate}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={assignTemplate} disabled={!pickedTemplate}>Assign</Button>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
