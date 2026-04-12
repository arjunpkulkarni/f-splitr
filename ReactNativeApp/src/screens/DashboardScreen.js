import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { colors, radii, shadows, spacing } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { bills, dashboard as dashboardApi, notifications as notificationsApi } from '../services/api';

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

const DRAFT_BILL_TITLE = 'Untitled Bill';

const ACTIVITY_TYPE_META = {
  bill_created: { icon: 'receipt-long', positive: true },
  payment_received: { icon: 'arrow-downward', positive: true },
  payment_sent: { icon: 'arrow-upward', positive: false },
  member_joined: { icon: 'person-add', positive: true },
  receipt_parsed: { icon: 'document-scanner', positive: true },
};

function formatCurrency(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || isNaN(num)) return '$0.00';
  return `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TopAppBar({ insets, user, onNotificationsPress, unreadCount }) {
  const { logout } = useAuth();

  const displayName =
    user?.full_name && user.full_name !== 'Member'
      ? compactDisplayName(user.full_name)
      : user?.phone
        ? compactDisplayName(user.phone)
        : 'Member';

  const initials = (user?.full_name || user?.phone || '?')
    .toString()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

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
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.profileAvatar} />
            ) : (
              <View style={[styles.profileAvatar, styles.initialsAvatar]}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.profileTextCol}>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {displayName}
            </Text>
          </View>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.iconButtonWrap}
            activeOpacity={0.7}
            onPress={onNotificationsPress}
            accessibilityLabel="Notifications"
          >
            <MaterialIcons
              name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'}
              size={24}
              color={colors.onSurface}
            />
            {unreadCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButtonWrap}
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

function BalanceHero({ overview }) {
  const owedToYou = parseFloat(overview?.total_owed_to_you ?? 0);
  const youOwe = parseFloat(overview?.total_you_owe ?? 0);
  const net = owedToYou - youOwe;
  const badgeText = net >= 0
    ? `+${formatCurrency(net)} owed to you`
    : `-${formatCurrency(net)} you owe`;

  return (
    <View style={styles.balanceHero}>
      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balanceAmount}>
        {net < 0 ? '-' : ''}{formatCurrency(net)}
      </Text>
      <View style={styles.badgeRow}>
        <View style={[styles.weeklyBadge, net < 0 && styles.weeklyBadgeNegative]}>
          <Text style={[styles.weeklyBadgeText, net < 0 && styles.weeklyBadgeTextNegative]}>
            {badgeText}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MemberCountBubbles({ count }) {
  const shown = Math.min(count, 3);
  const extra = count - shown;
  return (
    <View style={styles.avatarStack}>
      {Array.from({ length: shown }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stackAvatar,
            styles.placeholderAvatar,
            { marginLeft: i === 0 ? 0 : -12, zIndex: shown - i },
          ]}
        >
          <MaterialIcons name="person" size={18} color={colors.onSurfaceVariant} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.stackOverflow, { marginLeft: -12 }]}>
          <Text style={styles.stackOverflowText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

function FeaturedBillCard({ bill, onSettle }) {
  if (!bill) return null;
  const remaining = parseFloat(bill.remaining ?? bill.total ?? 0);

  return (
    <View style={[styles.featuredCard, shadows.card]}>
      <View style={styles.featuredCardTop}>
        <View style={styles.featuredIconWrap}>
          <MaterialIcons name="receipt-long" size={24} color={colors.tertiary} />
        </View>
        {remaining > 50 && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>High Priority</Text>
          </View>
        )}
      </View>
      <Text style={styles.featuredTitle} numberOfLines={1}>
        {bill.title || bill.merchant_name || 'Untitled Bill'}
      </Text>
      <Text style={styles.featuredSubtitle}>
        Split between {bill.member_count} {bill.member_count === 1 ? 'person' : 'people'}
      </Text>
      <View style={styles.featuredBottom}>
        <MemberCountBubbles count={bill.member_count} />
        <View style={styles.settleRow}>
          <Text style={styles.featuredAmount}>{formatCurrency(remaining)}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onSettle(bill)}>
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
        <MaterialIcons name="receipt-long" size={22} color={colors.secondary} />
      </View>
      <View style={styles.secondaryInfo}>
        <Text style={styles.secondaryTitle} numberOfLines={1}>
          {bill.title || bill.merchant_name || 'Untitled'}
        </Text>
        <Text style={styles.secondarySubtitle}>
          {bill.status} • {bill.member_count} {bill.member_count === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <Text style={styles.secondaryAmount}>{formatCurrency(bill.remaining ?? bill.total)}</Text>
    </View>
  );
}

function ActiveBillsSection({ bills, onSettle }) {
  if (!bills || bills.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Bills</Text>
        </View>
        <View style={[styles.emptyCard, shadows.card]}>
          <MaterialIcons name="receipt-long" size={40} color={colors.outlineVariant} />
          <Text style={styles.emptyText}>No active bills</Text>
          <Text style={styles.emptySubtext}>Tap + to create your first bill</Text>
        </View>
      </View>
    );
  }

  const [featured, ...rest] = bills;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Bills</Text>
        {bills.length > 3 && (
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FeaturedBillCard bill={featured} onSettle={onSettle} />
      {rest.length > 0 && <View style={styles.secondaryBillsGap} />}
      {rest.slice(0, 3).map((bill) => (
        <React.Fragment key={bill.id}>
          <SecondaryBillCard bill={bill} />
          <View style={styles.billCardGap} />
        </React.Fragment>
      ))}
    </View>
  );
}

function ActivityItem({ item, isLast, onPress }) {
  const meta = ACTIVITY_TYPE_META[item.type] || { icon: 'info', positive: true };
  const hasAmount = item.amount != null;
  const positive = meta.positive;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.activityItem, !isLast && styles.activityItemBorder]}
    >
      <View style={styles.activityIconWrap}>
        <MaterialIcons name={meta.icon} size={20} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {item.bill_title || item.description}
        </Text>
        <Text style={styles.activityDate}>{formatRelativeTime(item.timestamp)}</Text>
      </View>
      <View style={styles.activityRight}>
        {hasAmount && (
          <Text
            style={[
              styles.activityAmount,
              { color: positive ? colors.secondary : colors.error },
            ]}
          >
            {positive ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
        )}
        <Text style={styles.activityStatus}>
          {item.type.replace(/_/g, ' ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RecentActivitySection({ activities, onItemPress }) {
  if (!activities || activities.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={[styles.emptyCard, shadows.card]}>
          <MaterialIcons name="history" size={40} color={colors.outlineVariant} />
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={[styles.activityCard, shadows.card]}>
        {activities.map((item, i) => (
          <ActivityItem
            key={`${item.type}-${item.timestamp}-${i}`}
            item={item}
            isLast={i === activities.length - 1}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

function FloatingActionButton({ tabBarHeight, onPress, loading }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={loading}
      style={[styles.fab, shadows.fab, { bottom: tabBarHeight + 16 }]}
    >
      <LinearGradient
        colors={[colors.secondary, colors.secondaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fabGradient, loading && styles.fabGradientDisabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onSecondary} />
        ) : (
          <MaterialIcons name="add" size={28} color={colors.onSecondary} />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [activeBills, setActiveBills] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [creatingBill, setCreatingBill] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, billsRes, activityRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getActiveBills(),
        dashboardApi.getRecentActivity(),
      ]);
      setOverview(overviewRes.data);
      setActiveBills(billsRes.data ?? []);
      setRecentActivity(activityRes.data ?? []);
    } catch {
      // silently fail — show whatever data we have
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.list(true);
      setUnreadCount((res.data ?? []).length);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
    }, [fetchUnread]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchUnread()]);
    setRefreshing(false);
  }, [fetchData, fetchUnread]);

  const handleSettle = (bill) => {
    navigation.navigate('BillSplit', { billId: bill.id });
  };

  const handleCreateBillFromReceipt = useCallback(async () => {
    if (creatingBill) return;

    setCreatingBill(true);
    try {
      const res = await bills.create({ title: DRAFT_BILL_TITLE });
      const billId = res?.data?.id;

      if (!billId) {
        throw new Error('Missing bill ID');
      }

      navigation.navigate('ScanReceipt', { billId });
    } catch (err) {
      Alert.alert('Could not start bill', err?.error?.message ?? 'Please try again.');
    } finally {
      setCreatingBill(false);
    }
  }, [creatingBill, navigation]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopAppBar
        insets={insets}
        user={user}
        unreadCount={unreadCount}
        onNotificationsPress={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 72, paddingBottom: tabBarHeight + 88 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        <BalanceHero overview={overview} />
        <ActiveBillsSection bills={activeBills} onSettle={handleSettle} />
        <RecentActivitySection
          activities={recentActivity}
          onItemPress={(item) => {
            if (item.bill_id) navigation.navigate('ActivityDetail', { billId: item.bill_id });
          }}
        />
      </ScrollView>

      <FloatingActionButton
        tabBarHeight={tabBarHeight}
        loading={creatingBill}
        onPress={handleCreateBillFromReceipt}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryContainer,
    borderRadius: 20,
  },
  initialsText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
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
  iconButtonWrap: {
    padding: 8,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    fontWeight: '700',
    color: colors.onError,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

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
  weeklyBadgeNegative: {
    backgroundColor: colors.errorContainer,
  },
  weeklyBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  weeklyBadgeTextNegative: {
    color: colors.error,
  },

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

  emptyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.outlineVariant,
  },

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
  placeholderAvatar: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
  fabGradientDisabled: {
    opacity: 0.82,
  },
});
