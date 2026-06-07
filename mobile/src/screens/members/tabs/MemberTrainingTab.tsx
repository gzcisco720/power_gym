import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchMemberHistory,
  fetchMemberPersonalBests,
  fetchMemberActiveSession,
} from '../../../lib/api/training.api';
import { useTrainingStore } from '../../../stores/training.store';
import {
  WorkoutSession,
  ActivePlan,
  PlanDay,
  PersonalBest,
  ActiveSessionInfo,
} from '../../../types/training';
import { AppStackParamList } from '../../../navigation/index';
import { PersonalBestsGrid } from './components/PersonalBestsGrid';
import { StrengthProgressChart } from './components/StrengthProgressChart';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface MemberTrainingTabProps {
  memberId: string;
  memberName: string;
  activePlan: ActivePlan | null;
  onAssignPress: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Compute total volume (kg) for completed sets only. */
function computeVolume(session: WorkoutSession): number {
  return session.sets.reduce((sum, set) => {
    if (set.completedAt !== null && set.actualWeight !== null && set.actualReps !== null) {
      return sum + set.actualWeight * set.actualReps;
    }
    return sum;
  }, 0);
}

/** Map day name keyword to accent color class. */
function accentColorForDay(dayName: string): string {
  const lower = dayName.toLowerCase();
  if (lower.includes('push')) return 'bg-indigo-500/20';
  if (lower.includes('pull')) return 'bg-emerald-500/20';
  if (lower.includes('leg')) return 'bg-amber-500/20';
  if (lower.includes('upper')) return 'bg-pink-500/20';
  if (lower.includes('lower')) return 'bg-rose-500/20';
  return 'bg-muted';
}

export function MemberTrainingTab({ memberId, memberName, activePlan, onAssignPress }: MemberTrainingTabProps) {
  const navigation = useNavigation<Nav>();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberPlan, setMemberPlan] = useState<ActivePlan | null>(null);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  const fetchMemberPlan = useTrainingStore((s) => s.fetchMemberPlan);
  const startMemberSession = useTrainingStore((s) => s.startMemberSession);

  useEffect(() => {
    setLoading(true);
    fetchMemberHistory(memberId)
      .then((sessions) => setHistory(sessions))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));

    fetchMemberPersonalBests(memberId)
      .then((prs) => setPersonalBests(prs))
      .catch(() => setPersonalBests([]));

    fetchMemberActiveSession(memberId)
      .then((session) => setActiveSession(session))
      .catch(() => setActiveSession(null));
  }, [memberId]);

  useEffect(() => {
    fetchMemberPlan(memberId)
      .then((plan) => setMemberPlan(plan))
      .catch(() => setMemberPlan(null));
  }, [memberId, fetchMemberPlan]);

  async function handleLogSessionDay(day: PlanDay) {
    await startMemberSession(memberId, day.dayNumber);
    navigation.navigate('TrainerWorkoutSession', { memberId, memberName });
  }

  // Prefer activePlan prop (updated immediately after assignment) over the
  // internally-fetched memberPlan so Log Session day buttons appear without remount.
  const logPlan = activePlan ?? memberPlan;

  // Exercise list for the strength chart exercise selector
  const exercises = (logPlan?.days ?? []).flatMap((day) =>
    day.exercises.map((ex) => ({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName })),
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Active session continue banner */}
        {activeSession !== null ? (
          <Pressable
            testID="active-session-banner"
            accessibilityRole="button"
            accessibilityLabel="Continue active session"
            onPress={() => navigation.navigate('TrainerWorkoutSession', { memberId, memberName })}
            className="rounded-xl bg-primary/15 ring-1 ring-primary/30 px-3 py-2 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-xs font-semibold text-primary-light">
                Session In Progress
              </Text>
              <Text className="text-sm font-medium text-foreground mt-0.5" numberOfLines={1}>
                {activeSession.dayName}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-primary-light ml-2">Continue →</Text>
          </Pressable>
        ) : null}

        {/* Active plan section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Active Plan
          </Text>

          {activePlan ? (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">{activePlan.name}</Text>
              <Pressable
                testID="assign-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Reassign plan"
                accessibilityRole="button"
                className="rounded-lg bg-muted px-2.5 py-1"
              >
                <Text className="text-xs text-foreground/65">Reassign</Text>
              </Pressable>
            </View>
          ) : (
            <View className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-sm text-foreground/65">No plan assigned</Text>
              <Pressable
                testID="assign-plan-button"
                onPress={onAssignPress}
                accessibilityLabel="Assign plan"
                accessibilityRole="button"
                className="rounded-lg bg-primary px-2.5 py-1"
              >
                <Text className="text-xs font-semibold text-foreground">Assign</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Log Session section — shown when a plan with days is available */}
        {logPlan && logPlan.days.length > 0 ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Log Session
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {logPlan.days.map((day) => (
                <Pressable
                  key={day.dayNumber}
                  testID={`log-session-day-${day.dayNumber}`}
                  onPress={() => void handleLogSessionDay(day)}
                  accessibilityLabel={`Log session for ${day.name}`}
                  accessibilityRole="button"
                  className="rounded-xl bg-primary px-3 py-2 min-h-11 min-w-11 items-center justify-center"
                >
                  <Text className="text-xs font-semibold text-foreground">{day.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Personal Bests section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Personal Bests
          </Text>
          <PersonalBestsGrid personalBests={personalBests} />
        </View>

        {/* Strength Progress Chart */}
        {exercises.length > 0 ? (
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              Strength Progress
            </Text>
            <StrengthProgressChart memberId={memberId} exercises={exercises} />
          </View>
        ) : null}

        {/* Workout history section */}
        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
            Workout History
          </Text>

          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
              ))}
            </>
          ) : history.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-2">
              No completed workouts yet.
            </Text>
          ) : (() => {
              // Group sessions by month
              const groups: { month: string; sessions: WorkoutSession[] }[] = [];
              for (const session of history) {
                const mk = session.completedAt ? monthKey(session.completedAt) : 'Unknown';
                const last = groups[groups.length - 1];
                if (last && last.month === mk) {
                  last.sessions.push(session);
                } else {
                  groups.push({ month: mk, sessions: [session] });
                }
              }
              return groups.map(({ month, sessions: monthSessions }) => (
                <View key={month} className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mt-1">
                    {month}
                  </Text>
                  {monthSessions.map((session) => {
                    const volume = computeVolume(session);
                    const accentClass = accentColorForDay(session.dayName);
                    return (
                      <View
                        key={session._id}
                        testID={`history-session-${session._id}`}
                        className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden"
                      >
                        <View
                          testID={`accent-bar-${session._id}`}
                          className={accentClass}
                          style={{ height: 4 }}
                        />
                        <View className="px-3 py-2">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-medium text-foreground flex-1" numberOfLines={1}>
                              {session.dayName}
                            </Text>
                            <Text className="text-xs text-foreground/65 ml-2">
                              {session.completedAt ? formatDate(session.completedAt) : ''}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2 mt-0.5">
                            <Text className="text-xs text-foreground/65">
                              {`${session.sets.length} sets`}
                            </Text>
                            {volume > 0 ? (
                              <Text className="text-xs text-foreground/65">{`${volume} kg`}</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ));
            })()
          }
        </View>
      </View>
    </ScrollView>
  );
}
