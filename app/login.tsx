import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../src/lib/supabaseClient';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage('');
    setIsSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
      return;
    }

    router.replace('/(tabs)');
  };

  const handleSignUp = async () => {
    setErrorMessage('');
    setIsSigningIn(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
      return;
    }

    router.replace('/(tabs)');
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        style={[styles.button, isSigningIn && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isSigningIn}
      >
        <Text style={styles.buttonText}>{isSigningIn ? 'Please wait' : 'Sign in'}</Text>
      </Pressable>

      <Pressable
        style={[styles.button, isSigningIn && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={isSigningIn}
      >
        <Text style={styles.buttonText}>{isSigningIn ? 'Please wait' : 'Sign up'}</Text>
      </Pressable>

      <Pressable
        style={[styles.googleButton, isGoogleSigningIn && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={isGoogleSigningIn}
      >
        <Image source={require('../assets/google_icon.png')} style={styles.googleLogo} />
        <Text style={styles.googleButtonText}>
          {isGoogleSigningIn ? 'Please wait' : 'Continue with Google'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#b00020',
    fontSize: 14,
  },
  button: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 14,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
  googleLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  googleButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
});
