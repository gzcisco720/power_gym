import React, { useReducer, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useCalendarStore } from '../../../stores/calendar.store';
import { useMembersStore } from '../../../stores/members.store';
import { useTrainersStore } from '../../../stores/trainers.store';
import { useServiceTypesStore } from '../../../stores/service-types.store';
import { useAuthStore } from '../../../stores/auth.store';
import { StaffSession, CreateSessionInput, UpdateSessionInput } from '../../../types/scheduled-sessions';

interface SessionFormProps {
  session?: StaffSession;
  onClose: () => void;
}

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  memberIds: string[];
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypeId: string;
  customServiceName: string;
  recurrenceEnabled: boolean;
  recurrenceWeeks: string;
  scope: 'single' | 'series';
}

type FormAction =
  | { type: 'TOGGLE_MEMBER'; memberId: string }
  | { type: 'SET_TRAINER'; trainerId: string }
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_START'; value: string }
  | { type: 'SET_END'; value: string }
  | { type: 'SET_SERVICE_TYPE'; serviceTypeId: string; durationMin: number }
  | { type: 'SET_CUSTOM_NAME'; value: string }
  | { type: 'TOGGLE_RECURRENCE' }
  | { type: 'SET_RECURRENCE_WEEKS'; value: string }
  | { type: 'SET_SCOPE'; scope: 'single' | 'series' };

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'TOGGLE_MEMBER': {
      const exists = state.memberIds.includes(action.memberId);
      return {
        ...state,
        memberIds: exists
          ? state.memberIds.filter((id) => id !== action.memberId)
          : [...state.memberIds, action.memberId],
      };
    }
    case 'SET_TRAINER':
      return { ...state, trainerId: action.trainerId };
    case 'SET_DATE':
      return { ...state, date: action.value };
    case 'SET_START':
      return { ...state, startTime: action.value };
    case 'SET_END':
      return { ...state, endTime: action.value };
    case 'SET_SERVICE_TYPE': {
      const newEnd =
        state.startTime.match(/^\d{2}:\d{2}$/)
          ? addMinutes(state.startTime, action.durationMin)
          : state.endTime;
      return {
        ...state,
        serviceTypeId: action.serviceTypeId,
        endTime: newEnd,
      };
    }
    case 'SET_CUSTOM_NAME':
      return { ...state, customServiceName: action.value };
    case 'TOGGLE_RECURRENCE':
      return { ...state, recurrenceEnabled: !state.recurrenceEnabled };
    case 'SET_RECURRENCE_WEEKS':
      return { ...state, recurrenceWeeks: action.value };
    case 'SET_SCOPE':
      return { ...state, scope: action.scope };
    default:
      return state;
  }
}

function buildInitialState(session: StaffSession | undefined): FormState {
  if (!session) {
    return {
      memberIds: [],
      trainerId: '',
      date: '',
      startTime: '',
      endTime: '',
      serviceTypeId: '',
      customServiceName: '',
      recurrenceEnabled: false,
      recurrenceWeeks: '4',
      scope: 'single',
    };
  }
  return {
    memberIds: session.memberIds,
    trainerId: session.trainerId,
    date: session.date.slice(0, 10),
    startTime: session.startTime,
    endTime: session.endTime,
    serviceTypeId: session.serviceTypeId ?? '',
    customServiceName: session.customServiceName ?? '',
    recurrenceEnabled: false,
    recurrenceWeeks: '4',
    scope: 'single',
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SessionForm({ session, onClose }: SessionFormProps) {
  const isEditMode = !!session;
  const insets = useSafeAreaInsets();

  const calendarStore = useCalendarStore();
  const members = useMembersStore((s) => s.filteredMembers());
  const trainers = useTrainersStore((s) => s.trainers);
  const serviceTypes = useServiceTypesStore((s) => s.items);
  const user = useAuthStore((s) => s.user);

  const isOwner = user?.role === 'owner';
  const isSeriesEdit = isEditMode && session.seriesId != null;

  const [formState, dispatch] = useReducer(formReducer, buildInitialState(session));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isValid = useMemo(
    () =>
      formState.memberIds.length > 0 &&
      formState.date.trim() !== '' &&
      formState.startTime.trim() !== '' &&
      formState.endTime.trim() !== '',
    [formState.memberIds, formState.date, formState.startTime, formState.endTime],
  );

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isEditMode && session) {
        const dto: UpdateSessionInput = {
          date: formState.date || undefined,
          startTime: formState.startTime || undefined,
          endTime: formState.endTime || undefined,
          memberIds: formState.memberIds,
          serviceTypeId: formState.serviceTypeId || null,
          customServiceName: formState.customServiceName || null,
          scope: formState.scope,
        };
        await calendarStore.update(session._id, dto);
      } else {
        const dto: CreateSessionInput = {
          date: formState.date,
          startTime: formState.startTime,
          endTime: formState.endTime,
          memberIds: formState.memberIds,
          trainerId: isOwner && formState.trainerId ? formState.trainerId : undefined,
          serviceTypeId: formState.serviceTypeId || undefined,
          customServiceName: formState.customServiceName || undefined,
          recurrence: formState.recurrenceEnabled
            ? { weeks: parseInt(formState.recurrenceWeeks, 10) || 4 }
            : undefined,
        };
        await calendarStore.create(dto);
      }
      onClose();
    } catch {
      setSaving(false);
      setSaveError('Failed to save. Please try again.');
    }
  }, [formState, isEditMode, isOwner, isValid, saving, session, calendarStore, onClose]);

  const title = isEditMode ? 'Edit Session' : 'New Session';

  return (
    <Screen testID="screen-SessionForm">
      <ScreenHeader title={title} onBack={onClose} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Members picker */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Members <Text className="text-destructive">*</Text>
            </Text>
            <View className="gap-1">
              {members.map((member) => {
                const selected = formState.memberIds.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    testID={`member-option-${member.id}`}
                    onPress={() => dispatch({ type: 'TOGGLE_MEMBER', memberId: member.id })}
                    accessibilityLabel={member.name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    className={`flex-row items-center px-3 py-2 rounded-xl ring-1 ${
                      selected
                        ? 'bg-primary/10 ring-primary/30'
                        : 'bg-card ring-foreground/10'
                    }`}
                  >
                    <Text className={`text-sm ${selected ? 'text-primary-light font-medium' : 'text-foreground'}`}>
                      {member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Trainer picker (owner only) */}
          {isOwner && (
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Trainer
              </Text>
              <View className="gap-1">
                {trainers.map((trainer) => {
                  const selected = formState.trainerId === trainer.id;
                  return (
                    <Pressable
                      key={trainer.id}
                      testID={`trainer-option-${trainer.id}`}
                      onPress={() => dispatch({ type: 'SET_TRAINER', trainerId: trainer.id })}
                      accessibilityLabel={trainer.name}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      className={`flex-row items-center px-3 py-2 rounded-xl ring-1 ${
                        selected
                          ? 'bg-primary/10 ring-primary/30'
                          : 'bg-card ring-foreground/10'
                      }`}
                    >
                      <Text className={`text-sm ${selected ? 'text-primary-light font-medium' : 'text-foreground'}`}>
                        {trainer.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Date */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Date <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              testID="session-form-date-input"
              value={formState.date}
              onChangeText={(v) => dispatch({ type: 'SET_DATE', value: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="Session date"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Start time */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Start Time <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              testID="session-form-start-input"
              value={formState.startTime}
              onChangeText={(v) => dispatch({ type: 'SET_START', value: v })}
              placeholder="HH:MM"
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="Start time"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* End time */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              End Time <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              testID="session-form-end-input"
              value={formState.endTime}
              onChangeText={(v) => dispatch({ type: 'SET_END', value: v })}
              placeholder="HH:MM"
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="End time"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Service type picker */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Service Type{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <View className="gap-1">
              {serviceTypes.map((st) => {
                const selected = formState.serviceTypeId === st._id;
                return (
                  <Pressable
                    key={st._id}
                    testID={`service-type-option-${st._id}`}
                    onPress={() =>
                      dispatch({
                        type: 'SET_SERVICE_TYPE',
                        serviceTypeId: selected ? '' : st._id,
                        durationMin: st.durationMin,
                      })
                    }
                    accessibilityLabel={st.name}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={`flex-row items-center justify-between px-3 py-2 rounded-xl ring-1 ${
                      selected
                        ? 'bg-primary/10 ring-primary/30'
                        : 'bg-card ring-foreground/10'
                    }`}
                  >
                    <Text className={`text-sm ${selected ? 'text-primary-light font-medium' : 'text-foreground'}`}>
                      {st.name}
                    </Text>
                    <Text className="text-xs text-foreground/65">{st.durationMin} min</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Custom service name */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Custom Name{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <TextInput
              testID="session-form-custom-name-input"
              value={formState.customServiceName}
              onChangeText={(v) => dispatch({ type: 'SET_CUSTOM_NAME', value: v })}
              placeholder="e.g. Yoga, Swimming..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              accessibilityLabel="Custom session name"
              className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Recurrence (create only) */}
          {!isEditMode && (
            <View className="gap-2">
              <Pressable
                testID="session-form-recurrence-toggle"
                onPress={() => dispatch({ type: 'TOGGLE_RECURRENCE' })}
                accessibilityLabel="Toggle recurrence"
                accessibilityRole="switch"
                accessibilityState={{ checked: formState.recurrenceEnabled }}
                className="flex-row items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10"
              >
                <Text className="text-sm text-foreground">Repeat weekly</Text>
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    formState.recurrenceEnabled ? 'bg-primary/20' : 'bg-muted'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      formState.recurrenceEnabled ? 'text-primary-light' : 'text-foreground/65'
                    }`}
                  >
                    {formState.recurrenceEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </Pressable>

              {formState.recurrenceEnabled && (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Number of weeks (2–12)
                  </Text>
                  <TextInput
                    testID="session-form-recurrence-weeks-input"
                    value={formState.recurrenceWeeks}
                    onChangeText={(v) =>
                      dispatch({ type: 'SET_RECURRENCE_WEEKS', value: v })
                    }
                    keyboardType="decimal-pad"
                    placeholder="4"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    accessibilityLabel="Recurrence weeks"
                    className="rounded-xl bg-input px-3 py-2.5 text-sm text-foreground"
                  />
                </View>
              )}
            </View>
          )}

          {/* Scope selector (series edit only) */}
          {isSeriesEdit && (
            <View testID="session-form-scope-selector" className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Edit scope
              </Text>
              <View className="flex-row gap-2">
                {(['single', 'series'] as const).map((scopeOption) => {
                  const selected = formState.scope === scopeOption;
                  const label = scopeOption === 'single' ? 'This session only' : 'Whole series';
                  return (
                    <Pressable
                      key={scopeOption}
                      testID={`session-form-scope-${scopeOption}`}
                      onPress={() => dispatch({ type: 'SET_SCOPE', scope: scopeOption })}
                      accessibilityLabel={label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      className={`flex-1 items-center py-2 rounded-xl ring-1 ${
                        selected
                          ? 'bg-primary/10 ring-primary/30'
                          : 'bg-card ring-foreground/10'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selected ? 'text-primary-light' : 'text-foreground/65'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {saveError ? (
            <Text className="text-xs text-destructive text-center">{saveError}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View
        className="border-t border-foreground/10 bg-background/95 px-4 py-3 flex-row gap-2"
        style={{ paddingBottom: insets.bottom || 12 }}
      >
        <Pressable
          testID="session-form-cancel-button"
          onPress={onClose}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          className="flex-1 py-3 rounded-xl bg-muted items-center"
        >
          <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
        </Pressable>
        <Pressable
          testID="session-form-save-button"
          onPress={handleSave}
          disabled={!isValid || saving}
          accessibilityLabel="Save session"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || saving }}
          className={`flex-1 py-3 rounded-xl items-center ${
            isValid && !saving ? 'bg-primary' : 'bg-primary/30'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="text-sm font-semibold text-foreground">Save</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
