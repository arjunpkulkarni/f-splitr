import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../theme';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AVATAR_URLS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBYLmd0VIxB-yqNOZYE5J3nfTBJIL1xOlT3bLhEdzz0uby2GUFny-G8x29r0TsDvXwy10TMWDXr7grX3d85sC_S8II-uDRsLMcIIk_WmLmVTbEXMDtxHN8BHbabhhQ_u98KZnw_5-RvBi8s55yuXvTFdisZPFXaajqT5j-bPssoTWz9T9yAg0fgRSeorXDlFyk_94RD-T34hVuI3Rewgjvtdlg47Zr_rHZdwzU4ycMmcVZ_wH2AW-lp6KjQ7gvdtvTGECMvx_uF',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuALBynKcZ2zAfZXmMosryjI7bKzm63L8-uh56nHFFxgoXd-wnYJ8Idxwl-5ZQOWVOzL3EexU-zhaicDw46fAhASygOJkX7xZ9UjMkrpogho90ozA2CXLcPIOmpZZ0ade_4wCijdSmiGKFHM_KjH6nsH77hfb1bLYCkkXY4oEFb1hRvVKnAL5GzZp_zFDU_ZM13MPCtHUeIbZUdcK1orNyenx5ifv2mx-Jf1i2duODq_oiMM64OfiU-BcUP1_LGVl1veeaLoCQU-',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA_41JOXkyhaJ_Xn8N-qlkwfZCg5XHHS6JC5M2WdblKrNGkIrpNopGts-xy0JDGGjYp0p8mHb-NgeuUWBYdAffVFFvMfKGymTT0r3AUxIpVu5OCRl-B_mR9N-GXDQsyY7GcGUnGvuWYf2300syGHnrebLhOn1LnJfqxBl4dsOTEslYuSrpCSNpcpy_TvKLy5DQI2Niy15HWTAWd2MPoU5lvQOEL2U9ZYSSZLlQdPXyiJ1marpgHthRfyEZILOdAhig6LCZZ93x5',
];

const PROFILE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBPVqPqKe3UPsOPFyxVrVrEcM8dkxixaNRZHHMFRfgXtVAmDdLs8FKfSTdj5xKA5GfDQ3_8tIJHy05RnXx6t-Dk_yX6tOjX3BqyXo7u4CS-90rOFCGYzf4ONoJzf9E8mx0UBKYRCS9h-3IXlCngwsCGsauul2KyGDq7cf10JPI5tSHJ3shFQrFyQZBg4ryv0nuz74NhX0fUIGAm1ZTOos3LJgxHJpK7-AjDC90-UjvzUCeBav5Y-OuDkhDJmSEQKbytfn3YEnA8';

const BILLS = [
  {
    id: '1',
    title: 'Starbucks Mornings',
    subtitle: 'Ongoing \u2022 3 members',
    amount: '$42.50',
    icon: 'local-cafe',
    iconColor: colors.secondary,
  },
  {
    id: '2',
    title: 'Weekly Groceries',
    subtitle: 'Shared with Sarah',
    amount: '$128.15',
    icon: 'shopping-bag',
    iconColor: colors.primary,
  },
];

const ACTIVITY = [
  {
    id: '1',
    title: 'Sushi Corner',
    date: 'Yesterday, 8:30 PM',
    amount: '+$12.50',
    status: 'Settled',
    icon: 'restaurant-menu',
    positive: true,
  },
  {
    id: '2',
    title: 'Blue Bottle Caf\u00e9',
    date: 'Aug 24, 10:15 AM',
    amount: '-$8.40',
    status: 'Pending',
    icon: 'local-cafe',
    positive: false,
  },
  {
    id: '3',
    title: 'Cineplex Cinema',
    date: 'Aug 22, 11:00 PM',
    amount: '+$45.00',
    status: 'Settled',
    icon: 'movie',
    positive: true,
  },
];

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: true },
  { key: 'activity', label: 'Activity', icon: 'receipt-long', active: false },
  { key: 'profile', label: 'Profile', icon: 'person', active: false },
];

/** Keeps header compact so action icons stay on-screen (E.164 is very long). */
function compactDisplayName(raw) {
  if (!raw) return 'Member';
  if (typeof raw === 'string' && raw.startsWith('+')) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `•••• ${digits.slice(-4)}`;
    }
  }
  if (raw.length > 22) {
    return `${raw.slice(0, 20)}…`;
  }
  return raw;
}

function TopAppBar({ insets }) {
  const { user, logout } = useAuth();
  const displayName =
    user?.full_name && user.full_name !== 'Member'
      ? compactDisplayName(user.full_name)
      : user?.phone
        ? compactDisplayName(user.phone)
        : 'Member';

  const onLogout = () => {
    Alert.alert('Log out', 'Sign out of WealthSplit on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBarInner}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: PROFILE_URL }} style={styles.profileAvatar} />
          </View>
          <View style={styles.profileTextCol}>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {displayName}
            </Text>
          </View>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <MaterialIcons name="notifications-none" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={onLogout}
            accessibilityLabel="Log out"
          >
            <MaterialIcons name="logout" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function BalanceHero() {
  return (
    <View style={styles.balanceHero}>
      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balanceAmount}>$1,452.80</Text>
      <View style={styles.badgeRow}>
        <View style={styles.weeklyBadge}>
          <Text style={styles.weeklyBadgeText}>+$240 this week</Text>
        </View>
      </View>
    </View>
  );
}

function AvatarStack() {
  return (
    <View style={styles.avatarStack}>
      {AVATAR_URLS.map((url, i) => (
        <Image
          key={i}
          source={{ uri: url }}
          style={[
            styles.stackAvatar,
            { marginLeft: i === 0 ? 0 : -12, zIndex: AVATAR_URLS.length - i },
          ]}
        />
      ))}
      <View style={[styles.stackOverflow, { marginLeft: -12 }]}>
        <Text style={styles.stackOverflowText}>+2</Text>
      </View>
    </View>
  );
}

function FeaturedBillCard({ onSettle }) {
  return (
    <View style={[styles.featuredCard, shadows.card]}>
      <View style={styles.featuredCardTop}>
        <View style={styles.featuredIconWrap}>
          <MaterialIcons name="restaurant" size={24} color={colors.tertiary} />
        </View>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>High Priority</Text>
        </View>
      </View>
      <Text style={styles.featuredTitle}>Dinner at Taco Bar</Text>
      <Text style={styles.featuredSubtitle}>Split between 5 people</Text>
      <View style={styles.featuredBottom}>
        <AvatarStack />
        <View style={styles.settleRow}>
          <Text style={styles.featuredAmount}>$245.00</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onSettle}>
            <LinearGradient
              colors={[colors.secondary, colors.secondaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.settleButton, shadows.settleButton]}
            >
              <Text style={styles.settleButtonText}>Settle Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SecondaryBillCard({ bill }) {
  return (
    <View style={styles.secondaryCard}>
      <View style={styles.secondaryIconWrap}>
        <MaterialIcons name={bill.icon} size={22} color={bill.iconColor} />
      </View>
      <View style={styles.secondaryInfo}>
        <Text style={styles.secondaryTitle}>{bill.title}</Text>
        <Text style={styles.secondarySubtitle}>{bill.subtitle}</Text>
      </View>
      <Text style={styles.secondaryAmount}>{bill.amount}</Text>
    </View>
  );
}

function ActiveBillsSection({ onSettle }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Bills</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FeaturedBillCard onSettle={onSettle} />
      <View style={styles.secondaryBillsGap} />
      {BILLS.map((bill) => (
        <React.Fragment key={bill.id}>
          <SecondaryBillCard bill={bill} />
          <View style={styles.billCardGap} />
        </React.Fragment>
      ))}
    </View>
  );
}

function ActivityItem({ item, isLast, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.activityItem, !isLast && styles.activityItemBorder]}
    >
      <View style={styles.activityIconWrap}>
        <MaterialIcons name={item.icon} size={20} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
      <View style={styles.activityRight}>
        <Text
          style={[
            styles.activityAmount,
            { color: item.positive ? colors.secondary : colors.error },
          ]}
        >
          {item.amount}
        </Text>
        <Text style={styles.activityStatus}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

function RecentActivitySection({ onItemPress }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={[styles.activityCard, shadows.card]}>
        {ACTIVITY.map((item, i) => (
          <ActivityItem
            key={item.id}
            item={item}
            isLast={i === ACTIVITY.length - 1}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

function FloatingActionButton({ bottomInset, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fab, shadows.fab, { bottom: bottomInset + 88 }]}
    >
      <LinearGradient
        colors={[colors.secondary, colors.secondaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <MaterialIcons name="add" size={28} color={colors.onSecondary} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function BottomNavBar({ insets }) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {NAV_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.navItem, item.active && styles.navItemActive]}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={item.icon}
            size={24}
            color={item.active ? colors.secondary : colors.outlineVariant}
          />
          <Text style={[styles.navLabel, item.active && styles.navLabelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const handleSettle = () => {
    navigation.navigate('BillSplit');
  };

  return (
    <View style={styles.root}>
      <TopAppBar insets={insets} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHero />
        <ActiveBillsSection onSettle={handleSettle} />
        <RecentActivitySection onItemPress={() => navigation.navigate('ActivityDetail')} />
      </ScrollView>

      <FloatingActionButton bottomInset={insets.bottom} onPress={() => navigation.navigate('ScanReceipt')} />
      <BottomNavBar insets={insets} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top App Bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(248, 249, 250, 0.7)',
    ...Platform.select({
      ios: {},
      android: { backgroundColor: 'rgba(248, 249, 250, 0.92)' },
    }),
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHighest,
  },
  profileAvatar: {
    width: 40,
    height: 40,
  },
  welcomeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.onSurfaceVariant,
  },
  userName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.onSurface,
  },
  iconButton: {
    padding: 8,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Balance Hero
  balanceHero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  balanceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    color: colors.onSurface,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  weeklyBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  weeklyBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.onSurface,
  },
  viewAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },

  // Featured Bill Card
  featuredCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: 24,
  },
  featuredCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featuredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  priorityText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  featuredTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  featuredBottom: {
    marginTop: 24,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  featuredAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSurface,
  },
  settleButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  settleButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSecondary,
  },

  // Avatar Stack
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.surfaceContainerLowest,
  },
  stackOverflow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.surfaceContainerLowest,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackOverflowText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },

  // Secondary Bill Cards
  secondaryBillsGap: {
    height: 12,
  },
  billCardGap: {
    height: 12,
  },
  secondaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  secondaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryInfo: {
    flex: 1,
  },
  secondaryTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  secondarySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  secondaryAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },

  // Activity
  activityCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginTop: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  activityItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerLow,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  activityDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  activityStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    zIndex: 40,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    ...Platform.select({
      ios: {},
      android: { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
    }),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...shadows.ambient,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 108, 92, 0.08)',
  },
  navLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
    color: colors.outlineVariant,
  },
  navLabelActive: {
    color: colors.secondary,
  },
});
