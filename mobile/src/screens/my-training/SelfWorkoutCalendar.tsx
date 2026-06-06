import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SelfSessionSummary } from '../../types/training';

interface Props {
  sessions: SelfSessionSummary[];
  onSelect: (session: SelfSessionSummary) => void;
  initialMonth?: Date;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function SelfWorkoutCalendar({ sessions, onSelect, initialMonth }: Props) {
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() =>
    startOfMonth(initialMonth ?? new Date()),
  );

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Map day-of-month → session for the displayed month
  const sessionByDay = useMemo(() => {
    const map = new Map<number, SelfSessionSummary>();
    for (const session of sessions) {
      const d = new Date(session.completedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map.set(d.getDate(), session);
      }
    }
    return map;
  }, [sessions, year, month]);

  const handlePrevMonth = () => {
    setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Build grid cells: leading blanks + day numbers
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d });
  }

  return (
    <View testID="self-workout-calendar" className="px-4 py-4">
      {/* Month navigation header */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          testID="calendar-prev-month"
          onPress={handlePrevMonth}
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          className="p-2"
        >
          <Text className="text-foreground text-lg">‹</Text>
        </Pressable>

        <Text className="text-[15px] font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </Text>

        <Pressable
          testID="calendar-next-month"
          onPress={handleNextMonth}
          accessibilityLabel="Next month"
          accessibilityRole="button"
          className="p-2"
        >
          <Text className="text-foreground text-lg">›</Text>
        </Pressable>
      </View>

      {/* Day-of-week labels */}
      <View className="flex-row mb-1">
        {DAYS_OF_WEEK.map((dow) => (
          <View key={dow} className="flex-1 items-center">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              {dow}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      <View className="flex-row flex-wrap">
        {cells.map((cell, idx) => {
          if (cell.day === null) {
            return <View key={`blank-${idx}`} style={{ width: `${100 / 7}%` }} className="py-2" />;
          }

          const session = sessionByDay.get(cell.day);
          const isMarked = session !== undefined;

          if (isMarked) {
            return (
              <Pressable
                key={`day-${cell.day}`}
                testID={`calendar-day-marked-${cell.day}`}
                onPress={() => onSelect(session)}
                accessibilityLabel={`Training session on day ${cell.day}`}
                accessibilityRole="button"
                style={{ width: `${100 / 7}%` }}
                className="py-2 items-center"
              >
                <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                  <Text className="text-[13px] font-semibold text-foreground">{cell.day}</Text>
                </View>
              </Pressable>
            );
          }

          return (
            <View
              key={`day-${cell.day}`}
              testID={`calendar-day-${cell.day}`}
              style={{ width: `${100 / 7}%` }}
              className="py-2 items-center"
            >
              <Text className="text-[13px] text-foreground/65">{cell.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
