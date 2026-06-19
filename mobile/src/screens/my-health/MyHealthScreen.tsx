import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Screen } from '../../components/Screen';
import { InjuriesTab } from './tabs/InjuriesTab';
import { MedicationsTab } from './tabs/MedicationsTab';
import { MedicalBackgroundTab } from './tabs/MedicalBackgroundTab';

type TabId = 'injuries' | 'medications' | 'background';

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1">
        <TabsList className="flex-row border-b border-foreground/[.06] bg-background rounded-none h-auto p-0">
          <TabsTrigger
            value="injuries"
            testID="my-health-tab-injuries"
            className="flex-1 py-3"
          >
            <Text className="text-sm font-medium">Injuries</Text>
          </TabsTrigger>
          <TabsTrigger
            value="medications"
            testID="my-health-tab-medications"
            className="flex-1 py-3"
          >
            <Text className="text-sm font-medium">Medications</Text>
          </TabsTrigger>
          <TabsTrigger
            value="background"
            testID="my-health-tab-background"
            className="flex-1 py-3"
          >
            <Text className="text-sm font-medium">Background</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="injuries" className="flex-1">
          <InjuriesTab />
        </TabsContent>
        <TabsContent value="medications" className="flex-1">
          <MedicationsTab />
        </TabsContent>
        <TabsContent value="background" className="flex-1">
          <MedicalBackgroundTab />
        </TabsContent>
      </Tabs>
    </Screen>
  );
}
