import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Skeleton } from '~/components/ui/skeleton';
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

const TABS: { id: TabId; label: string; testID: string }[] = [
  { id: 'overview', label: 'Overview', testID: 'member-detail-tab-overview' },
  { id: 'bodytests', label: 'Body Tests', testID: 'member-detail-tab-bodytests' },
  { id: 'health', label: 'Health', testID: 'member-detail-tab-health' },
  { id: 'checkins', label: 'Check-ins', testID: 'member-detail-tab-checkins' },
  { id: 'training', label: 'Training', testID: 'member-detail-tab-training' },
  { id: 'nutrition', label: 'Nutrition', testID: 'member-detail-tab-nutrition' },
  { id: 'progress', label: 'Progress', testID: 'member-detail-tab-progress' },
  { id: 'photos', label: 'Photos', testID: 'member-detail-tab-photos' },
  { id: 'billing', label: 'Billing', testID: 'member-detail-tab-billing' },
];

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

      {/* Tab bar */}
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
              className={`flex-1 items-center py-2.5 border-b-2 ${
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
      </View>

      {/* Tab content */}
      {detailLoading || !detail ? (
        <View className="px-4 py-4 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </View>
      ) : (
        <>
          {activeTab === 'overview' ? (
            <MemberOverviewTab
              overviewStats={detail.overviewStats ?? null}
              onNavigateToTab={setActiveTab}
            />
          ) : null}
          {activeTab === 'bodytests' ? (
            <MemberBodyTestsTab
              bodyTests={detail.bodyTests}
              onPressBodyTest={handleBodyTestPress}
            />
          ) : null}
          {activeTab === 'health' ? (
            <MemberHealthTab injuries={detail.injuries} medications={detail.medications} />
          ) : null}
          {activeTab === 'checkins' ? (
            <MemberCheckInsTab
              memberId={memberId}
              checkIns={detail.checkIns}
              onPressCheckIn={(c: CheckIn) => navigation.navigate('CheckInDetail', { checkIn: c })}
            />
          ) : null}
          {activeTab === 'training' ? (
            <MemberTrainingTab
              memberId={memberId}
              memberName={member.name}
              activePlan={memberActivePlan}
              onAssignPress={() => setAssignSheetVisible(true)}
            />
          ) : null}
          {activeTab === 'nutrition' ? (
            <MemberNutritionTab
              memberId={memberId}
              activePlan={memberActiveNutritionPlan}
              onAssignPress={() => setAssignNutritionSheetVisible(true)}
            />
          ) : null}
          {activeTab === 'progress' ? (
            <MemberProgressTab memberId={memberId} />
          ) : null}
          {activeTab === 'photos' ? (
            <MemberPhotosTab memberId={memberId} />
          ) : null}
          {activeTab === 'billing' ? (
            <MemberBillingTab memberId={memberId} />
          ) : null}
        </>
      )}

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
