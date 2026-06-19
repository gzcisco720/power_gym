import React, { useReducer, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type Option,
} from '~/components/ui/select';

interface SessionFormProps {
  session?: StaffSession;
  onClose: () => void;
}

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  memberId: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypeId: string;
  customServiceName: string;
  customFee: string;
  recurrenceEnabled: boolean;
  recurrenceWeeks: string;
  scope: 'single' | 'series';
}

type FormAction =
  | { type: 'SET_MEMBER'; memberId: string }
  | { type: 'SET_TRAINER'; trainerId: string }
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_START'; value: string }
  | { type: 'SET_END'; value: string }
  | { type: 'SET_SERVICE_TYPE'; serviceTypeId: string; durationMin: number }
  | { type: 'SET_CUSTOM_NAME'; value: string }
  | { type: 'SET_CUSTOM_FEE'; value: string }
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
    case 'SET_MEMBER':
      return { ...state, memberId: action.memberId };
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
    case 'SET_CUSTOM_FEE':
      return { ...state, customFee: action.value };
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
      memberId: '',
      trainerId: '',
      date: '',
      startTime: '',
      endTime: '',
      serviceTypeId: '',
      customServiceName: '',
      customFee: '',
      recurrenceEnabled: false,
      recurrenceWeeks: '4',
      scope: 'single',
    };
  }
  return {
    memberId: session.memberIds[0] ?? '',
    trainerId: session.trainerId,
    date: session.date.slice(0, 10),
    startTime: session.startTime,
    endTime: session.endTime,
    serviceTypeId: session.serviceTypeId ?? '',
    customServiceName: session.customServiceName ?? '',
    customFee: '',
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
      formState.memberId !== '' &&
      formState.date.trim() !== '' &&
      formState.startTime.trim() !== '' &&
      formState.endTime.trim() !== '',
    [formState.memberId, formState.date, formState.startTime, formState.endTime],
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
          memberIds: [formState.memberId],
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
          memberIds: [formState.memberId],
          trainerId: isOwner && formState.trainerId ? formState.trainerId : undefined,
          serviceTypeId: formState.serviceTypeId || undefined,
          customServiceName: formState.customServiceName || undefined,
          customFee: parseFloat(formState.customFee) || undefined,
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

  const memberValue: Option | undefined = formState.memberId
    ? { value: formState.memberId, label: members.find((m) => m.id === formState.memberId)?.name ?? '' }
    : undefined;

  const trainerValue: Option | undefined = formState.trainerId
    ? { value: formState.trainerId, label: trainers.find((t) => t.id === formState.trainerId)?.name ?? '' }
    : undefined;

  const serviceTypeValue: Option | undefined = formState.serviceTypeId
    ? { value: formState.serviceTypeId, label: serviceTypes.find((st) => st._id === formState.serviceTypeId)?.name ?? '' }
    : undefined;

  return (
    <Screen testID="screen-SessionForm">
      <ScreenHeader title={title} onBack={onClose} safeTop={false} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-4">
          {/* Members picker */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Members <Text className="text-destructive">*</Text>
            </Text>
            <Select
              value={memberValue}
              onValueChange={(opt) => dispatch({ type: 'SET_MEMBER', memberId: opt?.value ?? '' })}
            >
              <SelectTrigger testID="member-select-trigger" className="bg-input border-none rounded-xl px-3">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} label={m.name} />
                ))}
              </SelectContent>
            </Select>
          </View>

          {/* Trainer picker (owner only) */}
          {isOwner && (
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                Trainer
              </Text>
              <Select
                value={trainerValue}
                onValueChange={(opt) => dispatch({ type: 'SET_TRAINER', trainerId: opt?.value ?? '' })}
              >
                <SelectTrigger testID="trainer-select-trigger" className="bg-input border-none rounded-xl px-3">
                  <SelectValue placeholder="Select trainer" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id} label={t.name} />
                  ))}
                </SelectContent>
              </Select>
            </View>
          )}

          {/* Date */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Date <Text className="text-destructive">*</Text>
            </Text>
            <Input
              testID="session-form-date-input"
              value={formState.date}
              onChangeText={(v) => dispatch({ type: 'SET_DATE', value: v })}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Session date"
            />
          </View>

          {/* Start time */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Start Time <Text className="text-destructive">*</Text>
            </Text>
            <Input
              testID="session-form-start-input"
              value={formState.startTime}
              onChangeText={(v) => dispatch({ type: 'SET_START', value: v })}
              placeholder="HH:MM"
              accessibilityLabel="Start time"
            />
          </View>

          {/* End time */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              End Time <Text className="text-destructive">*</Text>
            </Text>
            <Input
              testID="session-form-end-input"
              value={formState.endTime}
              onChangeText={(v) => dispatch({ type: 'SET_END', value: v })}
              placeholder="HH:MM"
              accessibilityLabel="End time"
            />
          </View>

          {/* Service type picker */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Service Type{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <Select
              value={serviceTypeValue}
              onValueChange={(opt) => {
                if (!opt) {
                  dispatch({ type: 'SET_SERVICE_TYPE', serviceTypeId: '', durationMin: 0 });
                  return;
                }
                const st = serviceTypes.find((s) => s._id === opt.value);
                dispatch({ type: 'SET_SERVICE_TYPE', serviceTypeId: opt.value, durationMin: st?.durationMin ?? 0 });
              }}
            >
              <SelectTrigger testID="service-type-select-trigger" className="bg-input border-none rounded-xl px-3">
                <SelectValue placeholder="Select service type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((st) => (
                  <SelectItem key={st._id} value={st._id} label={`${st.name} (${st.durationMin} min)`} />
                ))}
              </SelectContent>
            </Select>
          </View>

          {/* Custom service name */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Custom Name{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <Input
              testID="session-form-custom-name-input"
              value={formState.customServiceName}
              onChangeText={(v) => dispatch({ type: 'SET_CUSTOM_NAME', value: v })}
              placeholder="e.g. Yoga, Swimming..."
              accessibilityLabel="Custom session name"
            />
          </View>

          {/* Custom fee */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Custom Fee{' '}
              <Text className="text-foreground/65 text-[11px] normal-case">(optional)</Text>
            </Text>
            <Input
              testID="session-form-custom-fee-input"
              value={formState.customFee}
              onChangeText={(v) => dispatch({ type: 'SET_CUSTOM_FEE', value: v })}
              keyboardType="decimal-pad"
              placeholder="0.00"
              accessibilityLabel="Custom fee"
            />
          </View>

          {/* Recurrence (create only) */}
          {!isEditMode && (
            <View className="gap-2">
              <View
                className="flex-row items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10"
              >
                <Text className="text-sm text-foreground">Repeat weekly</Text>
                <Switch
                  testID="session-form-recurrence-toggle"
                  checked={formState.recurrenceEnabled}
                  onCheckedChange={() => dispatch({ type: 'TOGGLE_RECURRENCE' })}
                  accessibilityLabel="Toggle recurrence"
                />
              </View>

              {formState.recurrenceEnabled && (
                <View className="gap-1.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Number of weeks (2–12)
                  </Text>
                  <Input
                    testID="session-form-recurrence-weeks-input"
                    value={formState.recurrenceWeeks}
                    onChangeText={(v) =>
                      dispatch({ type: 'SET_RECURRENCE_WEEKS', value: v })
                    }
                    keyboardType="decimal-pad"
                    placeholder="4"
                    accessibilityLabel="Recurrence weeks"
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
        <Button
          testID="session-form-cancel-button"
          variant="ghost"
          onPress={onClose}
          accessibilityLabel="Cancel"
          accessibilityState={{ disabled: false }}
          className="flex-1"
        >
          <Text className="text-sm font-semibold text-foreground/65">Cancel</Text>
        </Button>
        <Button
          testID="session-form-save-button"
          onPress={handleSave}
          disabled={!isValid || saving}
          accessibilityLabel="Save session"
          accessibilityState={{ disabled: !isValid || saving }}
          className="flex-1"
        >
          <Text className="text-sm font-semibold text-foreground">Save</Text>
        </Button>
      </View>
    </Screen>
  );
}
