import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { useCalendarStore } from '../../stores/calendar.store';
import { useMembersStore } from '../../stores/members.store';
import { useTrainersStore } from '../../stores/trainers.store';
import { useServiceTypesStore } from '../../stores/service-types.store';
import { StaffSession } from '../../types/scheduled-sessions';
import { AgendaSessionCard } from './components/AgendaSessionCard';
import { SessionForm } from './components/SessionForm';

type DeleteScope = 'single' | 'series';

interface DeleteState {
  session: StaffSession;
  scope: DeleteScope;
}

export function CalendarScreen() {
  const calendarStore = useCalendarStore();
  const fetchMembers = useMembersStore((s) => s.fetchMembers);
  const fetchTrainers = useTrainersStore((s) => s.fetchTrainers);
  const fetchServiceTypes = useServiceTypesStore((s) => s.fetchServiceTypes);

  const { loading, range } = calendarStore;
  const groups = calendarStore.groupedByDay();

  const [formVisible, setFormVisible] = useState(false);
  const [editSession, setEditSession] = useState<StaffSession | undefined>(undefined);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const calendarFetch = calendarStore.fetch;

  useEffect(() => {
    void calendarFetch('upcoming');
    void fetchMembers();
    void fetchTrainers();
    void fetchServiceTypes();
  }, [calendarFetch, fetchMembers, fetchTrainers, fetchServiceTypes]);

  const handleAddPress = useCallback(() => {
    setEditSession(undefined);
    setFormVisible(true);
  }, []);

  const handleEdit = useCallback((session: StaffSession) => {
    setEditSession(session);
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback((session: StaffSession) => {
    setDeleteState({ session, scope: 'single' });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteState) return;
    await calendarStore.remove(deleteState.session._id, deleteState.scope);
    setDeleteState(null);
  }, [deleteState, calendarStore]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteState(null);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditSession(undefined);
  }, []);

  if (formVisible) {
    return <SessionForm session={editSession} onClose={handleFormClose} />;
  }

  return (
    <Screen testID="screen-Calendar">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Calendar
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Scheduled sessions
          </Text>
        </View>
        <Pressable
          testID="calendar-add-button"
          onPress={handleAddPress}
          accessibilityLabel="Add session"
          accessibilityRole="button"
          className="rounded-lg bg-primary px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-foreground">+ Add</Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View className="flex-row border-b border-foreground/[.06] bg-background">
        {(['upcoming', 'past'] as const).map((tab) => {
          const isActive = range === tab;
          return (
            <Pressable
              key={tab}
              testID={`calendar-tab-${tab}`}
              onPress={() => void calendarStore.fetch(tab)}
              accessibilityLabel={tab === 'upcoming' ? 'Upcoming' : 'Past'}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className={`flex-1 items-center py-3 border-b-2 ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-primary-light' : 'text-foreground/65'
                }`}
              >
                {tab === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                testID="calendar-skeleton-row"
                className="rounded-xl bg-muted h-16 opacity-60"
              />
            ))}
          </View>
        </ScrollView>
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text
            testID="calendar-empty-state"
            className="text-[15px] font-semibold text-foreground text-center"
          >
            No {range} sessions
          </Text>
          <Text className="text-[13px] text-foreground/65 text-center mt-1">
            {range === 'upcoming'
              ? 'Tap + Add to schedule a new session.'
              : 'No past sessions to show.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          testID="calendar-agenda-section"
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 py-4 gap-4">
            {groups.map((group) => (
              <View key={group.isoDate} className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                  {group.dateLabel}
                </Text>
                {group.sessions.map((session) => (
                  <AgendaSessionCard
                    key={session._id}
                    session={session}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Delete confirm dialog */}
      {deleteState !== null && (
        <View
          testID="delete-confirm-dialog"
          className="absolute inset-0 bg-background/80 items-center justify-center px-6"
        >
          <View className="w-full rounded-2xl bg-card ring-1 ring-foreground/10 p-5 gap-4">
            <Text className="text-[15px] font-semibold text-foreground">Delete Session</Text>
            <Text className="text-[13px] text-foreground/65">
              Are you sure you want to delete this session?
            </Text>

            {/* Series scope selector */}
            {deleteState.session.seriesId != null && (
              <View className="flex-row gap-2">
                <Pressable
                  testID="delete-scope-single"
                  onPress={() => setDeleteState((s) => s ? { ...s, scope: 'single' } : s)}
                  accessibilityLabel="This session only"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: deleteState.scope === 'single' }}
                  className={`flex-1 items-center py-2 rounded-xl ring-1 ${
                    deleteState.scope === 'single'
                      ? 'bg-primary/10 ring-primary/30'
                      : 'bg-muted ring-foreground/10'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      deleteState.scope === 'single' ? 'text-primary-light' : 'text-foreground/65'
                    }`}
                  >
                    This session only
                  </Text>
                </Pressable>
                <Pressable
                  testID="delete-scope-series"
                  onPress={() => setDeleteState((s) => s ? { ...s, scope: 'series' } : s)}
                  accessibilityLabel="Whole series"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: deleteState.scope === 'series' }}
                  className={`flex-1 items-center py-2 rounded-xl ring-1 ${
                    deleteState.scope === 'series'
                      ? 'bg-destructive/10 ring-destructive/30'
                      : 'bg-muted ring-foreground/10'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      deleteState.scope === 'series' ? 'text-destructive' : 'text-foreground/65'
                    }`}
                  >
                    Whole series
                  </Text>
                </Pressable>
              </View>
            )}

            <View className="flex-row gap-2">
              <Pressable
                testID="delete-cancel-button"
                onPress={handleDeleteCancel}
                accessibilityLabel="Cancel delete"
                accessibilityRole="button"
                className="flex-1 py-2.5 rounded-xl bg-muted items-center"
              >
                <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
              </Pressable>
              <Pressable
                testID="delete-confirm-button"
                onPress={() => void handleDeleteConfirm()}
                accessibilityLabel="Confirm delete"
                accessibilityRole="button"
                className="flex-1 py-2.5 rounded-xl bg-destructive/10 items-center ring-1 ring-destructive/20"
              >
                <Text className="text-sm font-semibold text-destructive">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}
