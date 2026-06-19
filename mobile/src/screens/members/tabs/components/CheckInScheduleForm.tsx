import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useCheckInScheduleStore } from '../../../../stores/check-in-schedule.store';
import { CheckInSchedule } from '../../../../lib/api/check-in-schedule.api';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { Button } from '~/components/ui/button';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface CheckInScheduleFormProps {
  memberId: string;
}

interface FormState {
  dayOfWeek: number;
  hour: number;
  active: boolean;
}

function scheduleToForm(schedule: CheckInSchedule | null): FormState {
  if (schedule) {
    return { dayOfWeek: schedule.dayOfWeek, hour: schedule.hour, active: schedule.active };
  }
  return { dayOfWeek: 1, hour: 9, active: true };
}

function isDirty(form: FormState, initial: FormState): boolean {
  return (
    form.dayOfWeek !== initial.dayOfWeek ||
    form.hour !== initial.hour ||
    form.active !== initial.active
  );
}

export function CheckInScheduleForm({ memberId }: CheckInScheduleFormProps) {
  const schedule = useCheckInScheduleStore((s) => s.schedule);
  const loading = useCheckInScheduleStore((s) => s.loading);
  const fetchSchedule = useCheckInScheduleStore((s) => s.fetchSchedule);
  const saveSchedule = useCheckInScheduleStore((s) => s.saveSchedule);

  const [initialForm, setInitialForm] = useState<FormState>(scheduleToForm(schedule));
  const [form, setForm] = useState<FormState>(scheduleToForm(schedule));

  useEffect(() => {
    void fetchSchedule(memberId);
  }, [memberId, fetchSchedule]);

  // When schedule loads, reset form to loaded values
  useEffect(() => {
    const loaded = scheduleToForm(schedule);
    setInitialForm(loaded);
    setForm(loaded);
  }, [schedule]);

  const dirty = isDirty(form, initialForm);

  async function handleSave() {
    await saveSchedule(memberId, {
      dayOfWeek: form.dayOfWeek,
      hour: form.hour,
      minute: 0,
      active: form.active,
    });
    setInitialForm(form);
  }

  return (
    <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3 gap-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Check-In Schedule
      </Text>

      {/* Day of Week */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Day
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {DAY_NAMES.map((day, idx) => (
            <Pressable
              key={day}
              testID={`schedule-day-${idx}`}
              onPress={() => setForm((f) => ({ ...f, dayOfWeek: idx }))}
              accessibilityLabel={day}
              accessibilityRole="button"
              className={`rounded-full px-3 py-1 ${form.dayOfWeek === idx ? 'bg-primary' : 'bg-muted'}`}
            >
              <Text className={`text-xs font-medium ${form.dayOfWeek === idx ? 'text-foreground' : 'text-foreground/65'}`}>
                {day.slice(0, 3)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Hour */}
      <View className="gap-1.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Hour (0–23)
        </Text>
        <Input
          testID="schedule-hour-input"
          value={String(form.hour)}
          onChangeText={(text) => {
            const parsed = parseInt(text, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
              setForm((f) => ({ ...f, hour: parsed }));
            } else if (text === '') {
              setForm((f) => ({ ...f, hour: 0 }));
            }
          }}
          keyboardType="number-pad"
          accessibilityLabel="Hour"
        />
      </View>

      {/* Active toggle */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-foreground">Active</Text>
        <Switch
          testID="schedule-active-switch"
          checked={form.active}
          onCheckedChange={(value) => setForm((f) => ({ ...f, active: value }))}
          accessibilityLabel="Schedule active"
        />
      </View>

      {/* Save button */}
      <Button
        testID="schedule-save-button"
        onPress={() => void handleSave()}
        disabled={!dirty || loading}
        accessibilityLabel="Save schedule"
        accessibilityState={{ disabled: !dirty || loading }}
        className="rounded-xl"
      >
        <Text className="text-sm font-semibold text-foreground">
          {loading ? 'Saving...' : 'Save'}
        </Text>
      </Button>
    </View>
  );
}
