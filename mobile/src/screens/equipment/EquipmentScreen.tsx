import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useEquipmentStore } from '../../stores/equipment.store';
import { FilterTab, EquipmentItem } from '../../types/equipment';
import { EquipmentCard } from './components/EquipmentCard';
import { AddEquipmentSheet } from './AddEquipmentSheet';
import { AppStackParamList } from '../../navigation/index';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'retired', label: 'Retired' },
];

type EquipmentScreenNav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function EquipmentScreen() {
  const navigation = useNavigation<EquipmentScreenNav>();
  const { items, filter, loading, fetchEquipment, setFilter } = useEquipmentStore();
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  function handleCardPress(item: EquipmentItem) {
    navigation.navigate('EquipmentDetail', { equipment: item });
  }

  useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  function renderEmpty() {
    if (items.length === 0) {
      return (
        <Text className="text-[13px] text-foreground/65 text-center mt-8">
          No equipment added yet.
        </Text>
      );
    }
    return (
      <Text className="text-[13px] text-foreground/65 text-center mt-8">
        No equipment matches this filter.
      </Text>
    );
  }

  return (
    <Screen testID="screen-Equipment">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Equipment
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage gym equipment</Text>
        </View>
        <Pressable
          testID="equipment-add-button"
          onPress={() => setAddSheetVisible(true)}
          accessibilityLabel="Add equipment"
          accessibilityRole="button"
          className="rounded-xl bg-primary px-3 py-2"
        >
          <Text className="text-sm font-semibold text-foreground">+ Add</Text>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View className="flex-row border-b border-foreground/[.06] bg-background">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <Pressable
              key={tab.id}
              testID={tab.id === 'active' ? 'equipment-filter-active' : undefined}
              onPress={() => setFilter(tab.id)}
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

      {/* List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60"
                />
              ))}
            </>
          ) : filtered.length === 0 ? (
            renderEmpty()
          ) : (
            filtered.map((item) => (
              <EquipmentCard key={item._id} item={item} onPress={() => handleCardPress(item)} />
            ))
          )}
        </View>
      </ScrollView>

      <AddEquipmentSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
      />
    </Screen>
  );
}
