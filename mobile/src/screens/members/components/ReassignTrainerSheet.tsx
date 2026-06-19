import React from 'react';
import { View, Text } from 'react-native';
import { TrainerListItem } from '../../../types/trainers';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type Option,
} from '~/components/ui/select';

interface ReassignTrainerSheetProps {
  trainers: TrainerListItem[];
  onSelect: (trainerId: string) => void;
  onClose: () => void;
}

export function ReassignTrainerSheet({ trainers, onSelect, onClose }: ReassignTrainerSheetProps) {
  return (
    <View className="flex-1">
      {/* Sheet header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] px-4 py-4">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          Reassign Trainer
        </Text>
        <Button
          onPress={onClose}
          accessibilityLabel="Close"
          variant="ghost"
          size="sm"
        >
          <Text className="text-sm text-foreground/65">Cancel</Text>
        </Button>
      </View>

      <View className="px-4 py-4">
        <Select
          value={undefined}
          onValueChange={(opt: Option | undefined) => {
            if (opt?.value) {
              onSelect(opt.value);
            }
          }}
        >
          <SelectTrigger testID="reassign-trainer-select-trigger" className="bg-input border-none rounded-xl px-3">
            <SelectValue placeholder="Select a trainer" />
          </SelectTrigger>
          <SelectContent>
            {trainers.length === 0 ? (
              <View className="px-3 py-2">
                <Text className="text-[13px] text-foreground/65">No trainers available.</Text>
              </View>
            ) : (
              trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={trainer.id} label={trainer.name} />
              ))
            )}
          </SelectContent>
        </Select>
      </View>
    </View>
  );
}
