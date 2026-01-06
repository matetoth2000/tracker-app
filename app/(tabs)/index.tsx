import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabaseClient';

type Habit = {
  id: string;
  name: string;
  unit: string;
  default_quantity: number | null;
  weekly_limit: number | null;
  active: boolean;
};

export default function LogScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const [habitsError, setHabitsError] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fetchHabits = useCallback(async () => {
    setHabitsError('');
    setIsLoadingHabits(true);

    const { data, error } = await supabase
      .from('habits')
      .select('id, name, unit, default_quantity, weekly_limit, active')
      .order('created_at', { ascending: true });

    if (error) {
      setHabitsError('Could not load habits.');
      setIsLoadingHabits(false);
      return;
    }

    setHabits(data ?? []);
    setIsLoadingHabits(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHabits();
    }, [fetchHabits])
  );

  const activeHabits = useMemo(() => habits.filter(h => h.active), [habits]);
  const archivedHabits = useMemo(() => habits.filter(h => !h.active), [habits]);

  const listData: Habit[] | any[] = [
    ...activeHabits,
    ...(isManageMode ? archivedHabits : []),
    { id: '__add__', name: 'Add Habit', unit: '', default_quantity: null, weekly_limit: null, active: true },
  ];

  const handleSignOut = async () => {
    setAuthErrorMessage('');
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }
    setIsSigningOut(false);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        style={styles.manageButton}
        onPress={() => setIsManageMode(prev => !prev)}
      >
        <Text style={styles.manageButtonText}>
          {isManageMode ? 'Done' : 'Edit'}
        </Text>
      </Pressable>

      {habitsError ? <Text style={styles.errorText}>{habitsError}</Text> : null}

      {isLoadingHabits ? (
        <Text style={styles.infoText}>Loading habits...</Text>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) =>
            item.id === '__add__' ? (
              <Pressable
                style={[styles.card, styles.addCard]}
                onPress={() => router.push('/add-habit')}
              >
                <Text style={[styles.cardTitle, styles.addCardTitle]}>
                  Add Habit
                </Text>
                <Text style={[styles.cardSubtitle, styles.addCardSubtitle]}>
                  Create a new habit
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.card,
                  isManageMode && styles.cardManage,
                  !item.active && styles.cardArchived,
                ]}
                onPress={() => {
                  if (isManageMode) {
                    router.push({
                      pathname: '/add-habit',
                      params: { habitId: item.id },
                    });
                  }
                }}
              >
                {isManageMode && (
                  <Text style={styles.manageTag}>
                    {item.active ? 'Edit' : 'Archived'}
                  </Text>
                )}
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.unit}</Text>
              </Pressable>
            )
          }
        />
      )}

      {authErrorMessage ? <Text style={styles.errorText}>{authErrorMessage}</Text> : null}

      <Pressable
        style={[styles.button, isSigningOut && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={isSigningOut}
      >
        <Text style={styles.buttonText}>{isSigningOut ? 'Signing out...' : 'Sign out'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  manageButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0070f3',
    marginBottom: 12,
  },
  manageButtonText: {
    color: '#0070f3',
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
    paddingBottom: 140,
  },
  card: {
    width: '100%',
    aspectRatio: 2,
    maxHeight: 150,
    alignSelf: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
  },
  cardManage: {
    borderColor: '#0070f3',
  },
  cardArchived: {
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  addCard: {
    backgroundColor: '#0070f3',
    borderColor: '#0060d4',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },
  addCardTitle: {
    color: '#fff',
  },
  addCardSubtitle: {
    color: '#e8e8e8',
  },
  manageTag: {
    position: 'absolute',
    top: 10,
    right: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#0070f3',
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#555',
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#0070f3',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
