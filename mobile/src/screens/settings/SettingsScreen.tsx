import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ProfileTab } from './tabs/ProfileTab';
import { SecurityTab } from './tabs/SecurityTab';
import { GymInfoTab } from './tabs/GymInfoTab';

type TabId = 'profile' | 'security' | 'gym';

interface Tab {
  id: TabId;
  label: string;
  testID: string;
}

const TABS_BASE: Tab[] = [
  { id: 'profile', label: 'Profile', testID: 'settings-tab-profile' },
  { id: 'security', label: 'Security', testID: 'settings-tab-security' },
];

const GYM_TAB: Tab = { id: 'gym', label: 'Gym Info', testID: 'settings-tab-gym' };

export function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';

  const tabs = role === 'owner' ? [...TABS_BASE, GYM_TAB] : TABS_BASE;
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      {/* Horizontal tab bar */}
      <View className="flex-row border-b border-foreground/[.06] bg-background">
        {tabs.map((tab) => {
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
      {activeTab === 'profile' ? <ProfileTab role={role} /> : null}
      {activeTab === 'security' ? <SecurityTab /> : null}
      {activeTab === 'gym' && role === 'owner' ? <GymInfoTab /> : null}
    </View>
  );
}
