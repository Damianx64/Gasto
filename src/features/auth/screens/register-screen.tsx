import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import { register } from '../auth.api';

const colors = {
  background: '#F7F2E7',
  card: 'rgba(255, 253, 248, 0.94)',
  field: '#FFFCF6',
  fieldBorder: '#D9D0BC',
  heading: '#344C29',
  ink: '#403E38',
  muted: '#959188',
  olive: '#85956D',
  oliveDark: '#60724E',
  rust: '#A95036',
  success: '#60724E',
  white: '#FFFFFF',
};

const homeAvatar = require('../../../../assets/images/pfp_casa.webp');

export default function RegisterScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      Keyboard.scheduleLayoutAnimation(event);
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', (event) => {
      Keyboard.scheduleLayoutAnimation(event);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function keepPasswordFieldVisible() {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }

  async function handleRegister() {
    setMessage('');
    setIsSuccessMessage(false);

    const trimmedEmail = email.trim();
    const trimmedUserName = userName.trim();

    if (!trimmedEmail || !password || !passwordConfirmation) {
      setMessage('Escribe tu correo, contraseña y confirmación de contraseña.');
      return;
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { requiresEmailConfirmation } = await register({
        email: trimmedEmail,
        password,
        userName: trimmedUserName,
      });

      if (requiresEmailConfirmation) {
        setIsSuccessMessage(true);
        setMessage('Cuenta creada. Revisa tu correo para confirmar el registro.');
        Alert.alert(
          'Cuenta creada',
          'Revisa tu correo para confirmar el registro.',
        );
      } else {
        router.replace('/');
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.decorationLayer}>
        <View style={styles.topGlow} />
        <View style={[styles.leaf, styles.topLeafOne]} />
        <View style={[styles.leaf, styles.topLeafTwo]} />
        <View style={[styles.leaf, styles.topLeafThree]} />
        <View style={styles.bottomHillBack} />
        <View style={styles.bottomHillFront} />
        <View style={[styles.leaf, styles.bottomLeafOne]} />
        <View style={[styles.leaf, styles.bottomLeafTwo]} />
        <View style={[styles.leaf, styles.bottomLeafThree]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.hero}>
                <View style={styles.avatarOrnament}>
                  <Image source={homeAvatar} style={styles.avatarImage} />
                  <View style={[styles.avatarLeaf, styles.avatarLeafLeft]} />
                  <View style={[styles.avatarLeaf, styles.avatarLeafRight]} />
                </View>

                <ThemedText style={styles.title}>Crea tu cuenta</ThemedText>
                <ThemedText style={styles.subtitle}>Comienza a organizar tus gastos</ThemedText>
                <ThemedText accessibilityElementsHidden style={styles.flourish}>
                  ❧
                </ThemedText>
              </View>

              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Nombre</ThemedText>
                  <View style={styles.inputShell}>
                    <SymbolView
                      fallback={<ThemedText style={styles.fallbackIcon}>○</ThemedText>}
                      name={{ ios: 'person', android: 'person', web: 'person' }}
                      size={22}
                      tintColor={colors.oliveDark}
                    />
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="name"
                      onChangeText={setUserName}
                      placeholder="Tu nombre"
                      placeholderTextColor={colors.muted}
                      returnKeyType="next"
                      style={styles.input}
                      textContentType="name"
                      value={userName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Correo electrónico</ThemedText>
                  <View style={styles.inputShell}>
                    <SymbolView
                      fallback={<ThemedText style={styles.fallbackIcon}>@</ThemedText>}
                      name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                      size={22}
                      tintColor={colors.oliveDark}
                    />
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      inputMode="email"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="ejemplo@correo.com"
                      placeholderTextColor={colors.muted}
                      returnKeyType="next"
                      style={styles.input}
                      textContentType="emailAddress"
                      value={email}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Contraseña</ThemedText>
                  <View style={styles.inputShell}>
                    <SymbolView
                      fallback={<ThemedText style={styles.fallbackIcon}>•</ThemedText>}
                      name={{ ios: 'lock', android: 'lock', web: 'lock' }}
                      size={22}
                      tintColor={colors.oliveDark}
                    />
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="new-password"
                      onChangeText={setPassword}
                      onFocus={keepPasswordFieldVisible}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={colors.muted}
                      returnKeyType="next"
                      secureTextEntry={!isPasswordVisible}
                      style={styles.input}
                      textContentType="newPassword"
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={
                        isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      hitSlop={10}
                      onPress={() => setIsPasswordVisible((visible) => !visible)}
                      style={({ pressed }) => pressed && styles.iconPressed}>
                      <SymbolView
                        fallback={
                          <ThemedText style={styles.fallbackIcon}>
                            {isPasswordVisible ? '×' : '○'}
                          </ThemedText>
                        }
                        name={
                          isPasswordVisible
                            ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                            : { ios: 'eye', android: 'visibility', web: 'visibility' }
                        }
                        size={22}
                        tintColor={colors.oliveDark}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Confirmar contraseña</ThemedText>
                  <View style={styles.inputShell}>
                    <SymbolView
                      fallback={<ThemedText style={styles.fallbackIcon}>•</ThemedText>}
                      name={{ ios: 'lock', android: 'lock', web: 'lock' }}
                      size={22}
                      tintColor={colors.oliveDark}
                    />
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="new-password"
                      onChangeText={setPasswordConfirmation}
                      onFocus={keepPasswordFieldVisible}
                      onSubmitEditing={handleRegister}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                      secureTextEntry={!isPasswordConfirmationVisible}
                      style={styles.input}
                      textContentType="newPassword"
                      value={passwordConfirmation}
                    />
                    <Pressable
                      accessibilityLabel={
                        isPasswordConfirmationVisible
                          ? 'Ocultar confirmación de contraseña'
                          : 'Mostrar confirmación de contraseña'
                      }
                      hitSlop={10}
                      onPress={() => setIsPasswordConfirmationVisible((visible) => !visible)}
                      style={({ pressed }) => pressed && styles.iconPressed}>
                      <SymbolView
                        fallback={
                          <ThemedText style={styles.fallbackIcon}>
                            {isPasswordConfirmationVisible ? '×' : '○'}
                          </ThemedText>
                        }
                        name={
                          isPasswordConfirmationVisible
                            ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                            : { ios: 'eye', android: 'visibility', web: 'visibility' }
                        }
                        size={22}
                        tintColor={colors.oliveDark}
                      />
                    </Pressable>
                  </View>
                </View>

                {message ? (
                  <ThemedText
                    accessibilityLiveRegion="polite"
                    style={[styles.feedback, isSuccessMessage && styles.successFeedback]}>
                    {message}
                  </ThemedText>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleRegister}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isSubmitting) && styles.buttonPressed,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <View style={styles.buttonContent}>
                      <ThemedText style={styles.primaryButtonText}>Crear cuenta</ThemedText>
                      <ThemedText accessibilityElementsHidden style={styles.buttonFlourish}>
                        ❧
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/login')}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <ThemedText style={styles.secondaryButtonText}>Ya tengo una cuenta</ThemedText>
                  <ThemedText accessibilityElementsHidden style={styles.secondaryFlourish}>
                    ❧
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  content: {
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: 520,
    minHeight: '100%',
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarOrnament: {
    alignItems: 'center',
    height: 106,
    justifyContent: 'center',
    marginBottom: Spacing.one,
    width: 138,
  },
  avatarImage: {
    backgroundColor: 'rgba(255, 253, 248, 0.82)',
    borderColor: 'rgba(133, 149, 109, 0.28)',
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    shadowColor: '#756E5D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    resizeMode: 'cover',
    width: 96,
  },
  avatarLeaf: {
    backgroundColor: '#96A27D',
    borderRadius: 12,
    height: 10,
    opacity: 0.65,
    position: 'absolute',
    width: 24,
  },
  avatarLeafLeft: {
    bottom: 5,
    left: 27,
    transform: [{ rotate: '28deg' }],
  },
  avatarLeafRight: {
    bottom: 5,
    right: 27,
    transform: [{ rotate: '-28deg' }],
  },
  title: {
    color: colors.heading,
    fontFamily: Fonts.serif,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 39,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.ink,
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    marginTop: 2,
    textAlign: 'center',
  },
  flourish: {
    color: colors.olive,
    fontFamily: Fonts.serif,
    fontSize: 26,
    lineHeight: 28,
    marginTop: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: 'rgba(217, 208, 188, 0.42)',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 5,
    gap: Spacing.three,
    padding: Spacing.four,
    shadowColor: '#776F60',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: colors.ink,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginLeft: 4,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.field,
    borderColor: colors.fieldBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: Spacing.three,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 16,
    minHeight: 56,
    paddingVertical: 0,
  },
  fallbackIcon: {
    color: colors.oliveDark,
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    width: 22,
  },
  iconPressed: {
    opacity: 0.55,
  },
  feedback: {
    color: colors.rust,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -6,
    textAlign: 'center',
  },
  successFeedback: {
    color: colors.success,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.olive,
    borderRadius: 17,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: Spacing.four,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
  },
  buttonFlourish: {
    color: colors.white,
    fontFamily: Fonts.serif,
    fontSize: 27,
    lineHeight: 28,
    position: 'absolute',
    right: 2,
    transform: [{ rotate: '-14deg' }],
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.5)',
    borderColor: colors.fieldBorder,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: Spacing.four,
  },
  secondaryButtonText: {
    color: colors.heading,
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 25,
  },
  secondaryFlourish: {
    color: colors.olive,
    fontFamily: Fonts.serif,
    fontSize: 25,
    lineHeight: 26,
    position: 'absolute',
    right: 20,
    transform: [{ rotate: '-14deg' }],
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  decorationLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  topGlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
    borderRadius: 140,
    height: 280,
    position: 'absolute',
    right: -105,
    top: -115,
    width: 280,
  },
  leaf: {
    backgroundColor: '#8B9A73',
    borderRadius: 20,
    height: 18,
    opacity: 0.2,
    position: 'absolute',
    width: 44,
  },
  topLeafOne: {
    right: 24,
    top: 82,
    transform: [{ rotate: '-36deg' }],
  },
  topLeafTwo: {
    right: 68,
    top: 117,
    transform: [{ rotate: '30deg' }],
  },
  topLeafThree: {
    right: 8,
    top: 147,
    transform: [{ rotate: '-42deg' }],
  },
  bottomHillBack: {
    backgroundColor: 'rgba(201, 206, 177, 0.35)',
    borderRadius: 240,
    bottom: -205,
    height: 310,
    left: -70,
    position: 'absolute',
    transform: [{ rotate: '6deg' }],
    width: 560,
  },
  bottomHillFront: {
    backgroundColor: 'rgba(163, 175, 137, 0.22)',
    borderRadius: 240,
    bottom: -235,
    height: 320,
    position: 'absolute',
    right: -155,
    transform: [{ rotate: '-5deg' }],
    width: 560,
  },
  bottomLeafOne: {
    bottom: 44,
    left: 18,
    transform: [{ rotate: '42deg' }],
  },
  bottomLeafTwo: {
    bottom: 84,
    left: -8,
    transform: [{ rotate: '-20deg' }],
  },
  bottomLeafThree: {
    bottom: 18,
    left: 65,
    transform: [{ rotate: '-34deg' }],
  },
});
