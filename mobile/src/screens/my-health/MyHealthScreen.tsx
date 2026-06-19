import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { InjuriesTab } from './tabs/InjuriesTab';
import { MedicationsTab } from './tabs/MedicationsTab';
import { MedicalBackgroundTab } from './tabs/MedicalBackgroundTab';

type TabId = 'injuries' | 'medications' | 'background';

interface Tab {
  id: TabId;
  label: string;
  testID: string;
}

const TABS: Tab[] = [
  { id: 'injuries', label: 'Injuries', testID: 'my-health-tab-injuries' },
  { id: 'medications', label: 'Medications', testID: 'my-health-tab-medications' },
  { id: 'background', label: 'Background', testID: 'my-health-tab-background' },
];

export function MyHealthScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('injuries');

  return (
    <Screen testID="screen-MyHealth">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Health
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Health records</Text>
        </View>
      </View>

      {/* Tab bar — Pressable used as tab container (allowed per design rules) */}
      <View className="flex-row border-b border-foreground/[.06] bg-background">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              testID={tab.testID}
              onPress={() => setActiveTab(tab.id)}
              accessibilityLabel={tab.label}
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
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'injuries' ? <InjuriesTab /> : null}
      {activeTab === 'medications' ? <MedicationsTab /> : null}
      {activeTab === 'background' ? <MedicalBackgroundTab /> : null}
    </Screen>
  );
}
