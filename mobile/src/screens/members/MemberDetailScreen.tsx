import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Text as UIText } from '~/components/ui/text';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useMembersStore } from '../../stores/members.store';
import { BodyTest } from '../../types/body-tests';
import { MemberOverviewTab } from './tabs/MemberOverviewTab';
import { MemberBodyTestsTab } from './tabs/MemberBodyTestsTab';
import { MemberHealthTab } from './tabs/MemberHealthTab';
import { MemberCheckInsTab } from './tabs/MemberCheckInsTab';
import { MemberTrainingTab } from './tabs/MemberTrainingTab';
import { MemberNutritionTab } from './tabs/MemberNutritionTab';
import { MemberProgressTab } from './tabs/MemberProgressTab';
import { MemberPhotosTab } from './tabs/MemberPhotosTab';
import { MemberBillingTab } from './tabs/MemberBillingTab';
import { AssignPlanSheet } from './AssignPlanSheet';
import { AssignNutritionPlanSheet } from './AssignNutritionPlanSheet';
import { AppStackParamList } from '../../navigation/index';
import { ActivePlan } from '../../types/training';
import { ActiveNutritionPlan } from '../../types/nutrition';
import { CheckIn } from '../../types/check-ins';

type DetailRouteProp = RouteProp<AppStackParamList, 'MemberDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

type TabId = 'overview' | 'bodytests' | 'health' | 'checkins' | 'training' | 'nutrition' | 'progress' | 'photos' | 'billing';


export function MemberDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRouteProp>();
  const { memberId } = route.params;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [memberActivePlan, setMemberActivePlan] = useState<ActivePlan | null>(null);
  const [memberActiveNutritionPlan, setMemberActiveNutritionPlan] = useState<ActiveNutritionPlan | null>(null);
  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [assignNutritionSheetVisible, setAssignNutritionSheetVisible] = useState(false);

  const members = useMembersStore((s) => s.members);
  const selectedMembers = useMembersStore((s) => s.selectedMembers);
  const detailLoading = useMembersStore((s) => s.detailLoading);
  const fetchMemberDetail = useMembersStore((s) => s.fetchMemberDetail);

  const member = members.find((m) => m.id === memberId) ?? null;
  const detail = selectedMembers[memberId] ?? null;

  useEffect(() => {
    void fetchMemberDetail(memberId);
  }, [fetchMemberDetail, memberId]);

  function handleBodyTestPress(bodyTest: BodyTest) {
    navigation.navigate('BodyTestDetail', { bodyTest });
  }

  if (!member) {
    return (
      <Screen testID="screen-MemberDetail">
        <ScreenHeader title="Member" onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[13px] text-foreground/65">Member not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="screen-MemberDetail">
      <ScreenHeader title={member.name} onBack={() => navigation.goBack()} />

      {/* Member header info */}
      <View className="px-4 py-3 border-b border-foreground/[.06] gap-1">
        <Text className="text-xs text-foreground/65">{member.email}</Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-primary/10 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-medium text-primary-light">member</Text>
          </View>
          {member.trainerName ? (
            <Text className="text-xs text-foreground/65">{member.trainerName}</Text>
          ) : null}
        </View>
      </View>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1">
        {/* Tab bar — scrollable to accommodate 9 tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-grow-0 border-b border-foreground/[.06] bg-background"
          contentContainerStyle={{ flexDirection: 'row' }}
        >
          <TabsList className="bg-transparent rounded-none h-auto p-0">
            <TabsTrigger
              testID="member-detail-tab-overview"
              value="overview"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Overview</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-bodytests"
              value="bodytests"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Body Tests</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-health"
              value="health"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Health</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-checkins"
              value="checkins"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Check-ins</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-training"
              value="training"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Training</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-nutrition"
              value="nutrition"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Nutrition</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-progress"
              value="progress"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Progress</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-photos"
              value="photos"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Photos</UIText>
            </TabsTrigger>
            <TabsTrigger
              testID="member-detail-tab-billing"
              value="billing"
              className="px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent"
            >
              <UIText className="text-xs font-medium">Billing</UIText>
            </TabsTrigger>
          </TabsList>
        </ScrollView>

        {/* Tab content */}
        {detailLoading || !detail ? (
          <View className="px-4 py-4 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </View>
        ) : (
          <>
            <TabsContent value="overview" className="flex-1">
              <MemberOverviewTab
                overviewStats={detail.overviewStats ?? null}
                onNavigateToTab={setActiveTab}
              />
            </TabsContent>
            <TabsContent value="bodytests" className="flex-1">
              <MemberBodyTestsTab
                bodyTests={detail.bodyTests}
                onPressBodyTest={handleBodyTestPress}
              />
            </TabsContent>
            <TabsContent value="health" className="flex-1">
              <MemberHealthTab injuries={detail.injuries} medications={detail.medications} />
            </TabsContent>
            <TabsContent value="checkins" className="flex-1">
              <MemberCheckInsTab
                memberId={memberId}
                checkIns={detail.checkIns}
                onPressCheckIn={(c: CheckIn) => navigation.navigate('CheckInDetail', { checkIn: c })}
              />
            </TabsContent>
            <TabsContent value="training" className="flex-1">
              <MemberTrainingTab
                memberId={memberId}
                memberName={member.name}
                activePlan={memberActivePlan}
                onAssignPress={() => setAssignSheetVisible(true)}
              />
            </TabsContent>
            <TabsContent value="nutrition" className="flex-1">
              <MemberNutritionTab
                memberId={memberId}
                activePlan={memberActiveNutritionPlan}
                onAssignPress={() => setAssignNutritionSheetVisible(true)}
              />
            </TabsContent>
            <TabsContent value="progress" className="flex-1">
              <MemberProgressTab memberId={memberId} />
            </TabsContent>
            <TabsContent value="photos" className="flex-1">
              <MemberPhotosTab memberId={memberId} />
            </TabsContent>
            <TabsContent value="billing" className="flex-1">
              <MemberBillingTab memberId={memberId} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Assign training plan sheet overlay */}
      {assignSheetVisible ? (
        <View className="absolute inset-0 bg-background">
          <AssignPlanSheet
            testID="assign-plan-sheet"
            memberId={memberId}
            onAssigned={(plan) => {
              setMemberActivePlan(plan);
              setAssignSheetVisible(false);
            }}
            onClose={() => setAssignSheetVisible(false)}
          />
        </View>
      ) : null}

      {/* Assign nutrition plan sheet overlay */}
      {assignNutritionSheetVisible ? (
        <View className="absolute inset-0 bg-background">
          <AssignNutritionPlanSheet
            testID="assign-nutrition-plan-sheet"
            memberId={memberId}
            onAssigned={(plan) => {
              setMemberActiveNutritionPlan(plan);
              setAssignNutritionSheetVisible(false);
            }}
            onClose={() => setAssignNutritionSheetVisible(false)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
