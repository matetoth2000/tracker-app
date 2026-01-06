import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabaseClient';

export default function AddHabitScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [defaultQuantity, setDefaultQuantity] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingHabit, setIsLoadingHabit] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { habitId } = useLocalSearchParams();
  const isEditMode = typeof habitId === 'string';

  const presets = [
    { label: 'Weed', name: 'Weed', unit: 'grams', defaultQuantity: 0.1 },
    { label: 'Alcohol', name: 'Alcohol', unit: 'drinks', defaultQuantity: 1 },
    { label: 'Smoking', name: 'Smoking', unit: 'cigarettes', defaultQuantity: 1 },
    { label: 'Coffee', name: 'Coffee', unit: 'cups', defaultQuantity: 1 },
    { label: 'Running', name: 'Running', unit: 'km', defaultQuantity: 1 },
    { label: 'Calories', name: 'Calories', unit: 'kcal', defaultQuantity: 100 },
  ];

  useEffect(() => {
    if (!isEditMode) return;

    const fetchHabit = async () => {
      setIsLoadingHabit(true);
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, unit, default_quantity, weekly_limit, active')
        .eq('id', habitId)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage('Could not load habit.');
        setIsLoadingHabit(false);
        return;
      }

      setName(data.name ?? '');
      setUnit(data.unit ?? '');
      setDefaultQuantity(
        data.default_quantity === null || data.default_quantity === undefined
          ? ''
          : String(data.default_quantity)
      );
      setWeeklyLimit(
        data.weekly_limit === null || data.weekly_limit === undefined
          ? ''
          : String(data.weekly_limit)
      );
      setIsArchived(data.active === false);
      setIsLoadingHabit(false);
    };

    fetchHabit();
  }, [habitId, isEditMode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>{isEditMode ? 'Edit Habit' : 'Add Habit'}</Text>
        {!isEditMode ? (
          <View style={styles.presetsSection}>
            <Text style={styles.label}>Presets</Text>
            <View style={styles.presetsContainer}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={styles.presetButton}
                  onPress={() => {
                    setName(preset.name);
                    setUnit(preset.unit);
                    setDefaultQuantity(String(preset.defaultQuantity));
                  }}
                >
                  <Text style={styles.presetButtonText}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Water"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Unit</Text>
          <TextInput
            style={[styles.input, isEditMode && styles.inputDisabled]}
            placeholder="e.g. glasses"
            value={unit}
            onChangeText={setUnit}
            editable={!isEditMode}
          />

          <Text style={styles.label}>Default quantity (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1"
            value={defaultQuantity}
            onChangeText={setDefaultQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Weekly limit (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 14"
            value={weeklyLimit}
            onChangeText={setWeeklyLimit}
            keyboardType="numeric"
          />
        </View>

        {isLoadingHabit ? <Text style={styles.infoText}>Loading habit...</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      {isEditMode ? (
        <Pressable
          style={[styles.toggleButton, isArchived ? styles.toggleArchived : styles.toggleActive]}
          onPress={() => setIsArchived((prev) => !prev)}
        >
          <Text style={styles.toggleText}>{isArchived ? 'Unarchive habit' : 'Archive habit'}</Text>
        </Pressable>
      ) : null}

      {isEditMode ? (
        <View style={styles.deleteSection}>
          <Pressable
            style={[styles.deleteButton, confirmDelete && styles.deleteButtonConfirm]}
            onPress={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }

              setErrorMessage('');
              setIsSaving(true);

              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) {
                setErrorMessage('You must be logged in.');
                setIsSaving(false);
                setConfirmDelete(false);
                return;
              }

              const { error: deleteError } = await supabase.from('habits').delete().eq('id', habitId);
              if (deleteError) {
                setErrorMessage('Could not delete habit. Please try again.');
                setIsSaving(false);
                setConfirmDelete(false);
                return;
              }

              setIsSaving(false);
              setConfirmDelete(false);
              router.back();
            }}
            disabled={isSaving}
          >
            <Text style={styles.deleteButtonText}>{confirmDelete ? 'Confirm delete' : 'Delete habit'}</Text>
          </Pressable>
          {confirmDelete ? (
            <Pressable
              style={styles.deleteCancel}
              onPress={() => setConfirmDelete(false)}
              disabled={isSaving}
            >
              <Text style={styles.deleteCancelText}>Cancel delete</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveDisabled]}
          disabled={isSaving}
          onPress={async () => {
            const trimmedName = name.trim();
            const trimmedUnit = unit.trim();
            if (!trimmedName || !trimmedUnit) {
              setErrorMessage('Name and unit are required.');
              return;
            }

            const parsedDefault = defaultQuantity.trim()
              ? parseFloat(defaultQuantity)
              : null;
            if (defaultQuantity.trim() && Number.isNaN(parsedDefault)) {
              setErrorMessage('Default quantity must be a number.');
              return;
            }

            const parsedWeekly = weeklyLimit.trim()
              ? parseFloat(weeklyLimit)
              : null;
            if (weeklyLimit.trim() && Number.isNaN(parsedWeekly)) {
              setErrorMessage('Weekly limit must be a number.');
              return;
            }

            setErrorMessage('');
            setIsSaving(true);

            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
              setErrorMessage('You must be logged in.');
              setIsSaving(false);
              return;
            }

            // Client-side duplicate check (trimmed, case-insensitive)
            const { data: existingHabits, error: fetchError } = await supabase
              .from('habits')
              .select('id, name');

            if (fetchError) {
              setErrorMessage('Could not save habit. Please try again.');
              setIsSaving(false);
              return;
            }

            const newNameKey = trimmedName.toLowerCase();
            const hasDuplicate = (existingHabits ?? []).some((h) => {
              if (isEditMode && h.id === habitId) return false;
              return (h.name ?? '').trim().toLowerCase() === newNameKey;
            });

            if (hasDuplicate) {
              setErrorMessage('You already have a habit with that name.');
              setIsSaving(false);
              return;
            }

            if (isEditMode) {
              const { error } = await supabase
                .from('habits')
                .update({
                  name: trimmedName,
                  unit: trimmedUnit,
                  default_quantity: parsedDefault,
                  weekly_limit: parsedWeekly,
                  active: !isArchived,
                })
                .eq('id', habitId)
                .single();

              if (error) {
                if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
                  setErrorMessage('You already have a habit with that name.');
                } else {
                  setErrorMessage('Could not save changes.');
                }
                setIsSaving(false);
                return;
              }

              setIsSaving(false);
              router.back();
              return;
            }

            const { error } = await supabase
              .from('habits')
              .insert({
                user_id: session.user.id,
                name: trimmedName,
                unit: trimmedUnit,
                default_quantity: parsedDefault,
                weekly_limit: parsedWeekly,
                active: true,
              })
              .select()
              .single();

            if (error) {
              if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
                setErrorMessage('You already have a habit with that name.');
              } else {
                setErrorMessage('Could not save habit. Please try again.');
              }
              setIsSaving(false);
              return;
            }

            setIsSaving(false);
            router.back();
          }}
      >
        <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
      </Pressable>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'space-between',
  },
  content: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  form: {
    marginTop: 12,
    gap: 12,
  },
  presetsSection: {
    marginTop: 12,
    gap: 8,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#0070f3',
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    marginTop: 8,
    color: '#b00020',
    fontSize: 14,
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  toggleActive: {
    borderColor: '#b00020',
  },
  toggleArchived: {
    borderColor: '#0070f3',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteSection: {
    marginTop: 0,
    gap: 8,
    marginHorizontal: 16,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b00020',
    alignItems: 'center',
  },
  deleteButtonConfirm: {
    backgroundColor: '#ffe5e5',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b00020',
  },
  deleteCancel: {
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 14,
    color: '#555',
  },
});
