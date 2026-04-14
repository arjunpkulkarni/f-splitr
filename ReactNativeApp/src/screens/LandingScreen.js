import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import SettldLogoMark from '../components/SettldLogoMark';
import LandingCtaButton from '../components/LandingCtaButton';
import { colors, spacing } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const navLock = useRef(false);

  const goToSignup = useCallback(() => {
    if (navLock.current) return;
    navLock.current = true;
    navigation.navigate('PhoneAuth');
    setTimeout(() => {
      navLock.current = false;
    }, 600);
  }, [navigation]);

  const goToLogin = useCallback(() => {
    if (navLock.current) return;
    navLock.current = true;
    navigation.navigate('Login');
    setTimeout(() => {
      navLock.current = false;
    }, 600);
  }, [navigation]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.logoGlow}>
          <SettldLogoMark size={Math.min(168, SCREEN_H * 0.2)} color={colors.white} />
        </View>
        <Text style={styles.title}>settld</Text>
        <Text style={styles.tagline}>Split bills, settle up instantly.</Text>
      </View>

      <View style={[styles.ctaColumn, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <LandingCtaButton label="Get Started" variant="primary" onPress={goToSignup} />
        <View style={{ height: spacing.md }} />
        <LandingCtaButton label="Log In" variant="outline" onPress={goToLogin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandLanding,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  logoGlow: {
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
    marginBottom: spacing['2xl'],
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.8,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  ctaColumn: {
    paddingHorizontal: spacing['2xl'],
    width: '100%',
  },
});
