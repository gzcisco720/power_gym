import React, { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ProfileTab } from './tabs/ProfileTab';
import { SecurityTab } from './tabs/SecurityTab';
import { GymInfoTab } from './tabs/GymInfoTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';

type TabId = 'profile' | 'security' | 'gym';

export function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1">
        {/* Horizontal tab bar */}
        <TabsList className="flex-row rounded-none border-b border-foreground/[.06] bg-background h-auto py-0">
          <TabsTrigger
            testID="settings-tab-profile"
            value="profile"
            accessibilityLabel="Profile"
            className="flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Text className="text-sm font-medium text-foreground/65">Profile</Text>
          </TabsTrigger>
          <TabsTrigger
            testID="settings-tab-security"
            value="security"
            accessibilityLabel="Security"
            className="flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Text className="text-sm font-medium text-foreground/65">Security</Text>
          </TabsTrigger>
          {role === 'owner' && (
            <TabsTrigger
              testID="settings-tab-gym"
              value="gym"
              accessibilityLabel="Gym Info"
              className="flex-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Text className="text-sm font-medium text-foreground/65">Gym Info</Text>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab content */}
        <TabsContent value="profile" className="flex-1">
          <ProfileTab role={role} />
        </TabsContent>
        <TabsContent value="security" className="flex-1">
          <SecurityTab />
        </TabsContent>
        {role === 'owner' && (
          <TabsContent value="gym" className="flex-1">
            <GymInfoTab />
          </TabsContent>
        )}
      </Tabs>
    </Screen>
  );
}
