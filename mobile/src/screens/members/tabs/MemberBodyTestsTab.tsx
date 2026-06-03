import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BodyTest } from '../../../types/body-tests';
import { BodyTestCard } from '../../body-test-shared/components/BodyTestCard';

interface MemberBodyTestsTabProps {
  bodyTests: BodyTest[];
  onPressBodyTest: (bodyTest: BodyTest) => void;
}

export function MemberBodyTestsTab({ bodyTests, onPressBodyTest }: MemberBodyTestsTabProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-2">
        {bodyTests.length === 0 ? (
          <Text className="text-[13px] text-foreground/65 text-center mt-4">
            No body tests recorded yet.
          </Text>
        ) : (
          bodyTests.map((bt) => (
            <BodyTestCard key={bt._id} bodyTest={bt} onPress={onPressBodyTest} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
