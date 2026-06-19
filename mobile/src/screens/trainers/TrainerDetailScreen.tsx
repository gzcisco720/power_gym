import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTrainersStore } from '../../stores/trainers.store';
import { TrainerOverviewTab } from './components/TrainerOverviewTab';
import { TrainerMembersTab } from './components/TrainerMembersTab';
import { TrainerCalendarTab } from './components/TrainerCalendarTab';
import { TrainerTrainingPlansTab } from './components/TrainerTrainingPlansTab';
import { TrainerNutritionPlansTab } from './components/TrainerNutritionPlansTab';
import { AppStackParamList } from '../../navigation/index';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Text as UIText } from '~/components/ui/text';
import { Skeleton } from '~/components/ui/skeleton';

type DetailRouteProp = RouteProp<AppStackParamList, 'TrainerDetail'>;

type TabId = 'overview' | 'members' | 'calendar' | 'training' | 'nutrition';

export function TrainerDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { trainerId, trainerName } = route.params;

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const detail = useTrainersStore((s) => s.detail);
  const detailLoading = useTrainersStore((s) => s.detailLoading);
  const fetchTrainerDetail = useTrainersStore((s) => s.fetchTrainerDetail);

  useEffect(() => {
    void fetchTrainerDetail(trainerId);
  }, [fetchTrainerDetail, trainerId]);

  return (
    <Screen testID="screen-TrainerDetail">
      <ScreenHeader title={trainerName} onBack={() => navigation.goBack()} />

      {/* Email sub-line */}
      {detail ? (
        <View className="px-4 py-2 border-b border-foreground/[.06]">
          <Text className="text-xs text-foreground/65">{detail.email}</Text>
        </View>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1">
        {/* Tab bar — scrollable to accommodate 5 tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-grow-0 border-b border-foreground/[.06] bg-background"
          contentContainerStyle={{ flexDirection: 'row' }}
        >
          <TabsList className="bg-transparent rounded-none h-auto p-0">
            <TabsTrigger
              testID="trainer-detail-tab-overview"
              value="overview"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Overview</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="trainer-detail-tab-members"
              value="members"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Members</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="trainer-detail-tab-calendar"
              value="calendar"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Calendar</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="trainer-detail-tab-training"
              value="training"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Training</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="trainer-detail-tab-nutrition"
              value="nutrition"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Nutrition</UIText>
            </TabsTrigger>
          </TabsList>
        </ScrollView>

        {/* Loading state — shown across all tabs while detail fetches */}
        {detailLoading || !detail ? (
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </View>
        ) : (
          <>
            <TabsContent value="overview" className="flex-1">
              <TrainerOverviewTab trainerId={trainerId} detail={detail} />
            </TabsContent>
            <TabsContent value="members" className="flex-1">
              <TrainerMembersTab trainerId={trainerId} />
            </TabsContent>
            <TabsContent value="calendar" className="flex-1">
              <TrainerCalendarTab trainerId={trainerId} />
            </TabsContent>
            <TabsContent value="training" className="flex-1">
              <TrainerTrainingPlansTab trainerId={trainerId} />
            </TabsContent>
            <TabsContent value="nutrition" className="flex-1">
              <TrainerNutritionPlansTab trainerId={trainerId} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Screen>
  );
}
