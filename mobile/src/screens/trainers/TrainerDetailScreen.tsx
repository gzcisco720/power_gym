import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
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

type DetailRouteProp = RouteProp<AppStackParamList, 'TrainerDetail'>;

type TabId = 'overview' | 'members' | 'calendar' | 'training' | 'nutrition';

const TABS: { id: TabId; label: string; testID: string }[] = [
  { id: 'overview', label: 'Overview', testID: 'trainer-detail-tab-overview' },
  { id: 'members', label: 'Members', testID: 'trainer-detail-tab-members' },
  { id: 'calendar', label: 'Calendar', testID: 'trainer-detail-tab-calendar' },
  { id: 'training', label: 'Training', testID: 'trainer-detail-tab-training' },
  { id: 'nutrition', label: 'Nutrition', testID: 'trainer-detail-tab-nutrition' },
];

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

      {/* Tab bar — scrollable to accommodate 5 tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0 border-b border-foreground/[.06] bg-background"
        contentContainerStyle={{ flexDirection: 'row' }}
      >
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
              className={`items-center px-4 py-2.5 border-b-2 ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? 'text-primary-light' : 'text-foreground/65'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      {detailLoading || !detail ? (
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2].map((i) => (
            <View key={i} className="rounded-xl bg-muted h-12 opacity-60" />
          ))}
        </View>
      ) : (
        <>
          {activeTab === 'overview' ? (
            <TrainerOverviewTab detail={detail} />
          ) : null}
          {activeTab === 'members' ? (
            <TrainerMembersTab trainerId={trainerId} />
          ) : null}
          {activeTab === 'calendar' ? (
            <TrainerCalendarTab trainerId={trainerId} />
          ) : null}
          {activeTab === 'training' ? (
            <TrainerTrainingPlansTab trainerId={trainerId} />
          ) : null}
          {activeTab === 'nutrition' ? (
            <TrainerNutritionPlansTab trainerId={trainerId} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
