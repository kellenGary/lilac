import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';

import { Button, Column, Container, Screen, Wordmark } from '@/shared-components';
import { useAuth } from '@/state/auth';
import { Field } from '../SignIn/components/Field';

const MIN_PASSWORD = 8;

/**
 * Two steps, no email links (so it works the same on phones and the web): ask for a code by email, then enter the
 * code with a new password. A correct code signs the user in with the new password.
 */
export function ResetPasswordPage() {
  const router = useRouter();
  const { sendResetCode, resetPassword } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const back = () => router.replace('/sign-in');
  const cleanEmail = email.trim();
  const cleanCode = code.replace(/\s/g, '');

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await sendResetCode(cleanEmail);
      setNotice(`If ${cleanEmail} has an account, we've sent it a code. It can take a minute to arrive.`);
      setStep('code');
    });

  const resend = () =>
    run(async () => {
      await sendResetCode(cleanEmail);
      setNotice('We sent a new code. Use the most recent one.');
    });

  const submit = () =>
    run(async () => {
      // On success the app sees a signed-in user and moves on by itself.
      await resetPassword(cleanEmail, cleanCode, password);
    });

  const canSend = cleanEmail.length > 3 && cleanEmail.includes('@') && !busy;
  const canSubmit = cleanCode.length >= 6 && password.length >= MIN_PASSWORD && !busy;

  return (
    <Screen>
      <Container>
        <View className="h-[60px] flex-row items-center justify-between">
          <Wordmark />
          <Button variant="ghost" label="Back" onPress={back} />
        </View>
        <Column className="max-w-[480px] pb-16 pt-6">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Reset your password
          </Text>
          <Text className="mt-2 text-base leading-6 text-muted">
            {step === 'email'
              ? "Enter your email and we'll send you a code to choose a new password."
              : 'Enter the code from your email and choose a new password.'}
          </Text>

          <View className="mt-6 gap-4">
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              editable={step === 'email'}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={step === 'email' && canSend ? sendCode : undefined}
            />
            {step === 'code' && (
              <>
                <Field
                  label="Code from email"
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <Field
                  ref={passwordRef}
                  label="New password"
                  secure
                  value={password}
                  onChangeText={setPassword}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={canSubmit ? submit : undefined}
                />
              </>
            )}
          </View>

          {error && (
            <View accessibilityRole="alert" className="mt-4 rounded-xl bg-rose px-4 py-3">
              <Text className="text-sm leading-5 text-roseInk">{error}</Text>
            </View>
          )}
          {notice && !error && (
            <View className="mt-4 rounded-xl bg-sage px-4 py-3">
              <Text className="text-sm leading-5 text-sageInk">{notice}</Text>
            </View>
          )}

          {step === 'email' ? (
            <Button
              size="lg"
              className="mt-6 w-full"
              label={busy ? 'One moment…' : 'Send code'}
              onPress={sendCode}
              disabled={!canSend}
            />
          ) : (
            <>
              <Button
                size="lg"
                className="mt-6 w-full"
                label={busy ? 'One moment…' : 'Set new password'}
                onPress={submit}
                disabled={!canSubmit}
              />
              <View className="mt-4 flex-row flex-wrap items-center gap-x-4">
                <Pressable accessibilityRole="button" onPress={resend} disabled={busy} className="py-1">
                  <Text className="text-sm font-medium text-ink underline">Send a new code</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setPassword('');
                    setError(null);
                    setNotice(null);
                  }}
                  className="py-1"
                >
                  <Text className="text-sm font-medium text-muted underline">Use a different email</Text>
                </Pressable>
              </View>
            </>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
