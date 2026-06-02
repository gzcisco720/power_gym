import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen } from '../../components/Screen';
import { useServiceTypesStore } from '../../stores/service-types.store';
import { FilterTab, ServiceType } from '../../types/service-types';
import { ServiceBottomSheet } from './ServiceBottomSheet';

const FILTER_TABS: { id: FilterTab; label: string; testID: string }[] = [
  { id: 'all', label: 'All', testID: 'services-filter-all' },
  { id: 'active', label: 'Active', testID: 'services-filter-active' },
  { id: 'inactive', label: 'Inactive', testID: 'services-filter-inactive' },
];

export function ServicesScreen() {
  const { items, filter, loading, fetchServiceTypes, setFilter } = useServiceTypesStore();
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [editService, setEditService] = useState<ServiceType | undefined>(undefined);

  useEffect(() => {
    void fetchServiceTypes();
  }, [fetchServiceTypes]);

  const filtered =
    filter === 'all'
      ? items
      : items.filter((i) => (filter === 'active' ? i.isActive : !i.isActive));

  function renderEmpty() {
    if (items.length === 0) {
      return (
        <Text className="text-[13px] text-foreground/65 text-center mt-8">
          No services added yet.
        </Text>
      );
    }
    return (
      <Text className="text-[13px] text-foreground/65 text-center mt-8">
        No services match this filter.
      </Text>
    );
  }

  return (
    <Screen testID="screen-Services">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            Services
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">Manage gym services</Text>
        </View>
        <Pressable
          testID="services-add-button"
          onPress={() => setAddSheetVisible(true)}
          accessibilityLabel="Add service"
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
              testID={tab.testID}
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
                <View key={i} className="rounded-xl bg-muted px-3 py-2 h-14 opacity-60" />
              ))}
            </>
          ) : filtered.length === 0 ? (
            renderEmpty()
          ) : (
            filtered.map((item) => (
              <Pressable
                key={item._id}
                testID={`service-card-${item._id}`}
                onPress={() => setEditService(item)}
                accessibilityLabel={item.name}
                accessibilityRole="button"
                className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] font-semibold text-foreground flex-1 mr-2" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[12px] text-foreground/65">
                      {item.durationMin}min · ${item.pricePerSession} {item.currency}
                    </Text>
                    {item.isActive ? (
                      <View className="bg-emerald-500/15 rounded-full px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-emerald-300">Active</Text>
                      </View>
                    ) : (
                      <View className="bg-muted rounded-full px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-foreground/35">Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <ServiceBottomSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
      />

      <ServiceBottomSheet
        key={editService?._id ?? 'new-edit'}
        visible={editService !== undefined}
        onClose={() => setEditService(undefined)}
        service={editService}
      />
    </Screen>
  );
}
