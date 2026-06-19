import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import {
  Injury,
  CreateInjuryDto,
  UpdateInjuryDto,
  InjuryType,
  BodyPart,
  BodySide,
  RehabStatus,
} from '../../../types/health';

const INJURY_TYPES: Array<{ value: InjuryType; label: string }> = [
  { value: 'acute', label: 'Acute' },
  { value: 'chronic', label: 'Chronic' },
  { value: 'post_surgery', label: 'Post-surgery' },
];

const BODY_PARTS: Array<{ value: BodyPart; label: string }> = [
  { value: 'knee', label: 'Knee' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'hip', label: 'Hip' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'neck', label: 'Neck' },
  { value: 'other', label: 'Other' },
];

const BODY_SIDES: Array<{ value: BodySide; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bilateral', label: 'Bilateral' },
];

const REHAB_STATUSES: Array<{ value: RehabStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'cleared', label: 'Cleared' },
];

interface SelectRowProps {
  label: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string | null) => void;
  testIDPrefix: string;
}

function SelectRow({ label, value, options, onChange, testIDPrefix }: SelectRowProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              testID={`${testIDPrefix}-${opt.value}`}
              onPress={() => onChange(isSelected ? null : opt.value)}
              accessibilityLabel={opt.label}
              accessibilityRole="button"
              className={`px-3 py-1.5 rounded-lg ${
                isSelected ? 'bg-primary' : 'bg-input'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isSelected ? 'text-foreground' : 'text-foreground/65'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface InjuryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  injury?: Injury;
  onSave: (dto: CreateInjuryDto | UpdateInjuryDto) => Promise<void>;
}

export function InjuryBottomSheet({ visible, onClose, injury, onSave }: InjuryBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const isEdit = injury !== undefined;

  const [title, setTitle] = useState(injury?.title ?? '');
  const [injuryType, setInjuryType] = useState<InjuryType | null>(injury?.injuryType ?? null);
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(injury?.bodyPart ?? null);
  const [bodySide, setBodySide] = useState<BodySide | null>(injury?.bodySide ?? null);
  const [painAtRest, setPainAtRest] = useState(injury?.painAtRest != null ? String(injury.painAtRest) : '');
  const [painDuringExercise, setPainDuringExercise] = useState(
    injury?.painDuringExercise != null ? String(injury.painDuringExercise) : '',
  );
  const [affectedMovements, setAffectedMovements] = useState(injury?.affectedMovements ?? '');
  const [mechanism, setMechanism] = useState(injury?.mechanism ?? '');
  const [aggravatingFactors, setAggravatingFactors] = useState(injury?.aggravatingFactors ?? '');
  const [relievingFactors, setRelievingFactors] = useState(injury?.relievingFactors ?? '');
  const [seenDoctor, setSeenDoctor] = useState(injury?.seenDoctor ?? false);
  const [doctorRestrictions, setDoctorRestrictions] = useState(injury?.doctorRestrictions ?? '');
  const [rehabilitationStatus, setRehabilitationStatus] = useState<RehabStatus | null>(
    injury?.rehabilitationStatus ?? null,
  );
  const [memberNotes, setMemberNotes] = useState(injury?.memberNotes ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(injury?.title ?? '');
      setInjuryType(injury?.injuryType ?? null);
      setBodyPart(injury?.bodyPart ?? null);
      setBodySide(injury?.bodySide ?? null);
      setPainAtRest(injury?.painAtRest != null ? String(injury.painAtRest) : '');
      setPainDuringExercise(injury?.painDuringExercise != null ? String(injury.painDuringExercise) : '');
      setAffectedMovements(injury?.affectedMovements ?? '');
      setMechanism(injury?.mechanism ?? '');
      setAggravatingFactors(injury?.aggravatingFactors ?? '');
      setRelievingFactors(injury?.relievingFactors ?? '');
      setSeenDoctor(injury?.seenDoctor ?? false);
      setDoctorRestrictions(injury?.doctorRestrictions ?? '');
      setRehabilitationStatus(injury?.rehabilitationStatus ?? null);
      setMemberNotes(injury?.memberNotes ?? '');
      setTitleError(null);
      setErrorMsg(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, injury?._id]);

  function handleClose() {
    onClose();
  }

  async function handleSave() {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError(null);
    setIsSaving(true);
    setErrorMsg(null);

    const dto: CreateInjuryDto = {
      title: title.trim(),
      ...(injuryType ? { injuryType } : {}),
      ...(bodyPart ? { bodyPart } : {}),
      ...(bodySide ? { bodySide } : {}),
      ...(painAtRest.trim() ? { painAtRest: parseFloat(painAtRest) } : {}),
      ...(painDuringExercise.trim() ? { painDuringExercise: parseFloat(painDuringExercise) } : {}),
      ...(affectedMovements.trim() ? { affectedMovements: affectedMovements.trim() } : {}),
      ...(mechanism.trim() ? { mechanism: mechanism.trim() } : {}),
      ...(aggravatingFactors.trim() ? { aggravatingFactors: aggravatingFactors.trim() } : {}),
      ...(relievingFactors.trim() ? { relievingFactors: relievingFactors.trim() } : {}),
      seenDoctor,
      ...(doctorRestrictions.trim() ? { doctorRestrictions: doctorRestrictions.trim() } : {}),
      ...(rehabilitationStatus ? { rehabilitationStatus } : {}),
      ...(memberNotes.trim() ? { memberNotes: memberNotes.trim() } : {}),
    };

    try {
      await onSave(dto);
      handleClose();
    } catch {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      testID="injury-bottom-sheet"
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="rounded-t-2xl bg-card"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '92%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-foreground/[.06]">
            <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
              {isEdit ? 'Edit Injury' : 'Report Injury'}
            </Text>
            <Button
              testID="injury-sheet-cancel"
              onPress={handleClose}
              accessibilityLabel="Cancel"
              variant="ghost"
              size="sm"
            >
              <Text className="text-sm text-foreground/65">Cancel</Text>
            </Button>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4 gap-4">
              {/* Title (required) */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Title <Text className="text-destructive">*</Text>
                </Text>
                <Input
                  testID="injury-title-input"
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    if (titleError) setTitleError(null);
                  }}
                  placeholder="e.g. Left knee strain"
                  autoCapitalize="sentences"
                  accessibilityLabel="Injury title"
                  aria-invalid={titleError != null}
                />
                {titleError ? (
                  <Text testID="injury-title-error" className="text-xs text-destructive">
                    {titleError}
                  </Text>
                ) : null}
              </View>

              <SelectRow
                label="Injury Type"
                value={injuryType}
                options={INJURY_TYPES}
                onChange={(v) => setInjuryType(v as InjuryType | null)}
                testIDPrefix="injury-type"
              />

              <SelectRow
                label="Body Part"
                value={bodyPart}
                options={BODY_PARTS}
                onChange={(v) => setBodyPart(v as BodyPart | null)}
                testIDPrefix="injury-bodypart"
              />

              <SelectRow
                label="Body Side"
                value={bodySide}
                options={BODY_SIDES}
                onChange={(v) => setBodySide(v as BodySide | null)}
                testIDPrefix="injury-bodyside"
              />

              {/* Pain at Rest */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Pain at Rest <Text className="text-foreground/65">(0–10, optional)</Text>
                </Text>
                <Input
                  testID="injury-pain-rest-input"
                  value={painAtRest}
                  onChangeText={setPainAtRest}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Pain at rest"
                />
              </View>

              {/* Pain During Exercise */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Pain During Exercise <Text className="text-foreground/65">(0–10, optional)</Text>
                </Text>
                <Input
                  testID="injury-pain-exercise-input"
                  value={painDuringExercise}
                  onChangeText={setPainDuringExercise}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Pain during exercise"
                />
              </View>

              {/* Affected Movements */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Affected Movements <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-movements-input"
                  value={affectedMovements}
                  onChangeText={setAffectedMovements}
                  placeholder="e.g. squatting, climbing stairs"
                  accessibilityLabel="Affected movements"
                />
              </View>

              {/* Mechanism */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  How did it happen <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-mechanism-input"
                  value={mechanism}
                  onChangeText={setMechanism}
                  placeholder="e.g. twisted during a run"
                  accessibilityLabel="Mechanism of injury"
                />
              </View>

              {/* Aggravating Factors */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Aggravating Factors <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-aggravating-input"
                  value={aggravatingFactors}
                  onChangeText={setAggravatingFactors}
                  placeholder="e.g. running, bending"
                  accessibilityLabel="Aggravating factors"
                />
              </View>

              {/* Relieving Factors */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Relieving Factors <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-relieving-input"
                  value={relievingFactors}
                  onChangeText={setRelievingFactors}
                  placeholder="e.g. rest, ice"
                  accessibilityLabel="Relieving factors"
                />
              </View>

              {/* Seen a Doctor */}
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Seen a Doctor
                </Text>
                <Switch
                  testID="injury-seen-doctor-toggle"
                  checked={seenDoctor}
                  onCheckedChange={setSeenDoctor}
                  accessibilityLabel="Seen a doctor"
                />
              </View>

              {/* Doctor Restrictions */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Doctor Restrictions <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-doctor-restrictions-input"
                  value={doctorRestrictions}
                  onChangeText={setDoctorRestrictions}
                  placeholder="e.g. no running for 2 weeks"
                  accessibilityLabel="Doctor restrictions"
                />
              </View>

              <SelectRow
                label="Rehabilitation Status"
                value={rehabilitationStatus}
                options={REHAB_STATUSES}
                onChange={(v) => setRehabilitationStatus(v as RehabStatus | null)}
                testIDPrefix="injury-rehab"
              />

              {/* My Notes */}
              <View className="gap-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  My Notes <Text className="text-foreground/65">(optional)</Text>
                </Text>
                <Input
                  testID="injury-notes-input"
                  value={memberNotes}
                  onChangeText={setMemberNotes}
                  placeholder="Any additional notes..."
                  accessibilityLabel="My notes"
                  multiline
                />
              </View>

              {errorMsg ? (
                <Text className="text-xs text-destructive text-center">{errorMsg}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-4 py-3 border-t border-foreground/10 bg-background/95">
            <Button
              testID="injury-save-button"
              onPress={() => void handleSave()}
              disabled={isSaving}
              accessibilityLabel="Save injury"
              accessibilityState={{ disabled: isSaving }}
              className="w-full"
            >
              <Text className="text-sm font-semibold text-foreground">Save</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
