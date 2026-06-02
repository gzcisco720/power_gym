import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useEquipmentStore } from '../../stores/equipment.store';
import { updateEquipment, deleteEquipment } from '../../lib/api/equipment.api';
import { UpdateEquipmentDto } from '../../types/equipment';
import { EquipmentDetailsTab } from './components/EquipmentDetailsTab';
import { ConditionReportsTab } from './components/ConditionReportsTab';
import { AppStackParamList } from '../../navigation/index';

type DetailRouteProp = RouteProp<AppStackParamList, 'EquipmentDetail'>;

type TabId = 'details' | 'condition-reports';

const TABS: { id: TabId; label: string; testID: string }[] = [
  { id: 'details', label: 'Details', testID: 'tab-details' },
  { id: 'condition-reports', label: 'Condition Reports', testID: 'tab-condition-reports' },
];

export function EquipmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { equipment: initialItem } = route.params ?? {};

  const updateItem = useEquipmentStore((s) => s.updateItem);
  const removeItem = useEquipmentStore((s) => s.removeItem);

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track the current item state for the detail tab
  const [currentItem, setCurrentItem] = useState(initialItem ?? null);

  async function handleSave(dto: UpdateEquipmentDto) {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updated = await updateEquipment(currentItem._id, dto);
      updateItem(updated);
      setCurrentItem(updated);
      setSuccessMsg('Changes saved');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEquipment(currentItem._id);
      removeItem(currentItem._id);
      navigation.goBack();
    } catch {
      setIsDeleting(false);
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  if (!currentItem) return null;

  return (
    <Screen>
      <ScreenHeader title={currentItem.name} onBack={() => navigation.goBack()} />

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
      {activeTab === 'details' ? (
        <EquipmentDetailsTab
          key={currentItem._id}
          item={currentItem}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
          isDeleting={isDeleting}
          successMsg={successMsg}
          errorMsg={errorMsg}
        />
      ) : (
        <ConditionReportsTab item={currentItem} />
      )}
    </Screen>
  );
}
