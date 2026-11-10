import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PlantState } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { todayKey, weekStartKey } from '@/lib/dates';
import { BloomBackground, Button, Plant, Reveal, Wordmark } from '@/shared-components';
import { useAuth } from '@/state/auth';
import { useColors } from '@/state/theme';
import { Field } from './components/Field';

// A healthy, flowering plant for the welcome panel.
const SHOWCASE: PlantState = { growth: 0.92, tension: 0.1, droop: 0, carry: 0.8, vitality: 0.9 };

export function SignInPage() {
  const { signIn, signUp } = useAuth();
  const { shadow } = useColors();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const creating = mode === 'up';
  const canSubmit =
    (!creating || fullName.trim().length > 0) &&
    email.trim().length > 3 &&
    password.length >= (creating ? 8 : 1) &&
    !busy;

  const switchMode = (next: 'in' | 'up') => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (creating) {
        const signedIn = await signUp(email.trim(), password, fullName.trim());
        if (!signedIn) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('in');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-cream">
      <BloomBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View className="w-full max-w-[1120px] flex-1 flex-col self-center px-5 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
            {/* Welcome */}
            <View className="py-6 lg:flex-1 lg:py-0">
              <Wordmark />
              <View className="mt-8 lg:mt-14">
                <Reveal delay={150}>
                  <Text
                    accessibilityRole="header"
                    className="max-w-[520px] text-4xl font-bold leading-[42px] tracking-normal text-ink lg:text-[52px] lg:leading-[56px]"
                  >
                    A quiet place to write, and notice how you are doing.
                  </Text>
                </Reveal>
                <Reveal delay={350}>
                  <Text className="mt-4 max-w-[460px] text-base leading-6 text-body lg:text-lg lg:leading-7">
                    Write a little each day. Lilac Pages reads what you wrote and shows how your mood and sense of meaning
                    move over time, and grows a plant from it.
                  </Text>
                </Reveal>
              </View>
              <Reveal delay={600} style={{ marginTop: 24 }}>
                <View className="hidden w-[300px] lg:flex">
                  <Plant state={SHOWCASE} species={speciesForWeek(weekStartKey(todayKey()))} sway tight />
                </View>
              </Reveal>
            </View>

            {/* Form */}
            <View className="w-full max-w-[480px] self-center pb-10 lg:w-[440px] lg:self-auto lg:pb-0">
              <Reveal delay={300}>
                <View
                  className="rounded-3xl bg-surface p-6 lg:p-8"
                  style={{
                    shadowColor: shadow,
                    shadowOpacity: 0.08,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 8 },
                  }}
                >
                  <View className="flex-row rounded-xl bg-track p-1" accessibilityRole="tablist">
                    {(['up', 'in'] as const).map((m) => (
                      <Pressable
                        key={m}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: mode === m }}
                        onPress={() => switchMode(m)}
                        className={`h-10 flex-1 items-center justify-center rounded-lg ${mode === m ? 'bg-cream' : ''}`}
                      >
                        <Text className={`text-sm font-semibold ${mode === m ? 'text-ink' : 'text-muted'}`}>
                          {m === 'up' ? 'Create account' : 'Sign in'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text className="mt-6 text-2xl font-bold tracking-tight text-ink">
                    {creating ? 'Start your journal' : 'Welcome back'}
                  </Text>
                  <Text className="mt-1 text-[15px] leading-[22px] text-muted">
                    {creating ? 'Your first entry is next. It takes a minute.' : 'Pick up where you left off.'}
                  </Text>

                  <View className="mt-6 gap-4">
                    {creating && (
                      <Field
                        label="Full name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your name"
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                      />
                    )}
                    <Field
                      ref={emailRef}
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                    <Field
                      ref={passwordRef}
                      label="Password"
                      secure
                      value={password}
                      onChangeText={setPassword}
                      placeholder={creating ? 'At least 8 characters' : 'Your password'}
                      autoComplete={creating ? 'new-password' : 'current-password'}
                      textContentType={creating ? 'newPassword' : 'password'}
                      returnKeyType="go"
                      onSubmitEditing={submit}
                    />
                  </View>

                  {error && (
                    <View accessibilityRole="alert" className="mt-4 rounded-xl bg-rose px-4 py-3">
                      <Text className="text-sm leading-5 text-roseInk">{error}</Text>
                    </View>
                  )}
                  {notice && (
                    <View className="mt-4 rounded-xl bg-sage px-4 py-3">
                      <Text className="text-sm leading-5 text-sageInk">{notice}</Text>
                    </View>
                  )}

                  <Button
                    size="lg"
                    className="mt-6 w-full"
                    label={busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
                    onPress={submit}
                    disabled={!canSubmit}
                  />

                  <Text className="mt-4 text-center text-[13px] leading-5 text-muted">
                    Your entries are encrypted before they are stored.
                  </Text>
                </View>
              </Reveal>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
