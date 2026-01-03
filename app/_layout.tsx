import type { Session } from '@supabase/supabase-js';
import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../src/lib/supabaseClient';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const lastUpsertedUserId = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setHasCheckedSession(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasCheckedSession) return;

    const isOnLogin = pathname === '/login';

    if (!session && !isOnLogin) {
      router.replace('/login');
    } else if (session && isOnLogin) {
      router.replace('/home');
    }
  }, [hasCheckedSession, session, pathname, router]);

  useEffect(() => {
    if (!session) return;
    if (lastUpsertedUserId.current === session.user.id) return;

    const upsertProfile = async () => {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (error) {
        console.error('Failed to upsert profile', error);
        return;
      }

      lastUpsertedUserId.current = session.user.id;
    };

    upsertProfile();
  }, [session]);

  if (!hasCheckedSession) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <Stack />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
