import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, shadows } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import {
  bills as billsApi,
  payments as paymentsApi,
  invites as invitesApi,
} from '../services/api';

const STATUS_CONFIG = {
  paid: { color: colors.secondary, icon: 'check-circle', label: 'Paid' },
  pending: { color: colors.outline, icon: 'schedule', label: 'Pending' },
  reminder: { color: colors.tertiary, icon: 'mail', label: 'Notified' },
};

function formatMoney(n) {
  const x = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (Number.isNaN(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

function TopAppBar({ insets, onBack, title }) {
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBarInner}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          )}
          <Text style={styles.appTitle} numberOfLines={1}>{title || 'Bill Details'}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MaterialIcons name="more-vert" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillHeader({ bill, memberCount }) {
  const title = bill?.merchant_name || bill?.title || 'Untitled Bill';
  return (
    <View style={styles.billHeader}>
      <View style={styles.billHeaderLeft}>
        <Text style={styles.billTitle}>{title}</Text>
        <Text style={styles.billSubtitle}>
          Shared between {memberCount} participant{memberCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.billHeaderRight}>
        <Text style={styles.billTotal}>{formatMoney(bill?.total)}</Text>
        <Text style={styles.billTotalLabel}>TOTAL BILL</Text>
      </View>
    </View>
  );
}

function ProgressCard({ collected, remaining, total }) {
  const progress = total > 0 ? Math.round((collected / total) * 100) : 0;
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Collection Progress</Text>
        <Text style={styles.progressPercent}>{progress}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <View style={styles.progressFooter}>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatAmount}>{formatMoney(collected)}</Text>
          <Text style={styles.progressStatLabel}> collected</Text>
        </View>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatAmountError}>{formatMoney(remaining)}</Text>
          <Text style={styles.progressStatLabel}> remaining</Text>
        </View>
      </View>
    </View>
  );
}

function ParticipantCard({ participant }) {
  const config = STATUS_CONFIG[participant.status] || STATUS_CONFIG.pending;
  return (
    <View style={styles.participantCard}>
      <View style={styles.participantLeft}>
        <View style={styles.participantAvatarWrap}>
          <Text style={styles.participantInitial}>
            {(participant.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.participantName}>{participant.name}</Text>
          <Text style={styles.participantDetail}>{participant.detail}</Text>
        </View>
      </View>
      <View style={styles.participantRight}>
        <Text style={styles.participantAmount}>{formatMoney(participant.amount)}</Text>
        <View style={styles.statusBadge}>
          <MaterialIcons name={config.icon} size={12} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ParticipantSection({ participants, onNudge, nudging }) {
  const hasPending = participants.some((p) => p.status !== 'paid');
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Participant{'\n'}Status</Text>
        {hasPending && (
          <TouchableOpacity activeOpacity={0.85} style={styles.nudgeButton} onPress={onNudge} disabled={nudging}>
            {nudging ? (
              <ActivityIndicator size="small" color={colors.onSecondary} />
            ) : (
              <>
                <MaterialIcons name="campaign" size={16} color={colors.onSecondary} />
                <Text style={styles.nudgeText}>Nudge{'\n'}Pending</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.participantList}>
        {participants.map((p) => (
          <ParticipantCard key={p.id} participant={p} />
        ))}
      </View>
    </View>
  );
}

function CashCallout({ onMarkPaid }) {
  return (
    <View style={styles.cashCallout}>
      <Text style={styles.cashTitle}>Did someone pay in cash?</Text>
      <Text style={styles.cashDesc}>
        You can manually mark participants as paid if they settled outside of the app.
      </Text>
      <TouchableOpacity activeOpacity={0.8} onPress={onMarkPaid} style={styles.markPaidButton}>
        <Text style={styles.markPaidText}>Mark Others as Paid</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ActivityDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const billId = route?.params?.billId;

  const [bill, setBill] = useState(null);
  const [members, setMembers] = useState([]);
  const [paymentsByMember, setPaymentsByMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nudging, setNudging] = useState(false);

  const fetchData = useCallback(async () => {
    if (!billId) return;
    try {
      const [sumRes, payRes] = await Promise.all([
        billsApi.getSummary(billId),
        paymentsApi.listForBill(billId),
      ]);
      const data = sumRes.data;
      setBill(data.bill);
      setMembers(data.members ?? []);

      const paidMap = {};
      (payRes.data ?? []).forEach((p) => {
        if (p.status === 'succeeded') {
          const mid = String(p.bill_member_id);
          paidMap[mid] = (paidMap[mid] || 0) + parseFloat(p.amount ?? 0);
        }
      });
      setPaymentsByMember(paidMap);
    } catch {
      // keep whatever state we have
    }
  }, [billId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchData().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }, [fetchData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleNudge = async () => {
    setNudging(true);
    try {
      await invitesApi.share(billId);
      Alert.alert('Reminders sent', 'Payment reminders have been sent to pending members.');
    } catch {
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setNudging(false);
    }
  };

  const billTotal = parseFloat(bill?.total ?? 0);
  const collected = Object.values(paymentsByMember).reduce((s, v) => s + v, 0);
  const remaining = Math.max(0, billTotal - collected);

  const uid = user?.id ? String(user.id) : null;

  const participants = members.map((m) => {
    const mid = String(m.id);
    const paid = paymentsByMember[mid] || 0;
    const isMe = uid && m.user_id != null && String(m.user_id) === uid;
    const status = paid > 0 ? 'paid' : 'pending';
    const detail = paid > 0
      ? `Paid ${formatMoney(paid)}`
      : 'Awaiting payment';
    return {
      id: mid,
      name: `${m.nickname || 'Member'}${isMe ? ' (You)' : ''}`,
      detail,
      amount: paid > 0 ? paid : parseFloat(m.amount_owed ?? 0),
      status,
    };
  });

  const myMember = members.find(
    (m) => uid && m.user_id != null && String(m.user_id) === uid,
  );
  const myPaid = myMember ? (paymentsByMember[String(myMember.id)] || 0) : 0;
  const showPayMyShare = myMember && myPaid <= 0;

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>Bill not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopAppBar
        insets={insets}
        onBack={navigation?.canGoBack?.() ? navigation.goBack : null}
        title={bill?.merchant_name || bill?.title}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        <BillHeader bill={bill} memberCount={members.length} />
        <ProgressCard collected={collected} remaining={remaining} total={billTotal} />
        <ParticipantSection participants={participants} onNudge={handleNudge} nudging={nudging} />

        {showPayMyShare && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ReviewPayment', { billId })}
            style={{ marginBottom: 20 }}
          >
            <LinearGradient
              colors={[colors.secondary, colors.secondaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.payMyShareButton, shadows.settleButton]}
            >
              <MaterialIcons name="payment" size={20} color={colors.onSecondary} />
              <Text style={styles.payMyShareText}>Pay My Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <CashCallout onMarkPaid={() => navigation.navigate('FundsCollected', {
          amount: collected,
          merchantName: bill?.merchant_name || bill?.title,
          billTitle: bill?.title,
          billId,
        })} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  linkText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.secondary,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  appTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.onSurface,
    flex: 1,
  },
  iconButton: {
    padding: 8,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingTop: 16,
  },
  billHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  billTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.onSurface,
    lineHeight: 34,
  },
  billSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },
  billHeaderRight: {
    alignItems: 'flex-end',
  },
  billTotal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  billTotalLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.outline,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  progressCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: 24,
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  progressPercent: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  progressTrack: {
    height: 12,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    backgroundColor: colors.secondary,
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressStatAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  progressStatAmountError: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
  },
  progressStatLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    fontWeight: '500',
    color: colors.outline,
  },

  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.onSurface,
    lineHeight: 26,
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  nudgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSecondary,
    lineHeight: 17,
  },

  participantList: {
    gap: 12,
  },
  participantCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  participantAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.secondary,
  },
  participantName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 2,
  },
  participantDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  participantRight: {
    alignItems: 'flex-end',
  },
  participantAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  payMyShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: radii.full,
  },
  payMyShareText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSecondary,
  },

  cashCallout: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.xl,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    marginBottom: 16,
  },
  cashTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  cashDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  markPaidButton: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  markPaidText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
  },
});
