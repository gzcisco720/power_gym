import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useBodyTestsStore } from '../../stores/body-tests.store';
import { useAuthStore } from '../../stores/auth.store';
import { BodyTest } from '../../types/body-tests';
import { BodyTestCard } from '../body-test-shared/components/BodyTestCard';
import { AppStackParamList } from '../../navigation/index';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Drawer'>;

export function MyBodyTestsScreen() {
  const navigation = useNavigation<Nav>();
  const { items, loading, fetchMyBodyTests } = useBodyTestsStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    void fetchMyBodyTests();
  }, [fetchMyBodyTests]);

  function handleCardPress(bodyTest: BodyTest) {
    navigation.navigate('BodyTestDetail', { bodyTest });
  }

  return (
    <Screen testID="screen-MyBodyTests">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground/[.06] bg-background px-4 py-4">
        <View>
          <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
            My Body Tests
          </Text>
          <Text className="mt-0.5 text-[12px] text-foreground/65">
            Body composition history
          </Text>
        </View>
        {user?.role !== 'member' && (
          <Button
            testID="bodytests-add-button"
            onPress={() => navigation.navigate('AddBodyTest')}
            accessibilityLabel="Add body test"
            size="icon"
            className="rounded-xl"
          >
            <Text className="text-sm font-semibold text-foreground">+</Text>
          </Button>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 gap-2">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="rounded-xl h-14" />
              ))}
            </>
          ) : items.length === 0 ? (
            <Text className="text-[13px] text-foreground/65 text-center mt-4">
              No body tests recorded yet.
            </Text>
          ) : (
            items.map((item) => (
              <BodyTestCard key={item._id} bodyTest={item} onPress={handleCardPress} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
