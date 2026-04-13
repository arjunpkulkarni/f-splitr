import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, radii } from '../theme';
import { payPublic } from '../services/api';

const IS_WEB = Platform.OS === 'web';

let loadStripe = null;
let Elements = null;
let PaymentElement = null;
let PaymentRequestButtonElement = null;
let useStripe = null;
let useElements = null;

if (IS_WEB) {
  try {
    loadStripe = require('@stripe/stripe-js').loadStripe;
    const reactStripe = require('@stripe/react-stripe-js');
    Elements = reactStripe.Elements;
    PaymentElement = reactStripe.PaymentElement;
    PaymentRequestButtonElement = reactStripe.PaymentRequestButtonElement;
    useStripe = reactStripe.useStripe;
    useElements = reactStripe.useElements;
  } catch {
    // Stripe packages unavailable on native — handled below
  }
}

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = IS_WEB && loadStripe && STRIPE_PK ? loadStripe(STRIPE_PK) : null;

function formatMoney(n) {
  const x = typeof n === 'string' ? parseFloat(n) : Number(n);
  if (Number.isNaN(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

// ─── Expired State ───────────────────────────────────────────────────────────

function ExpiredScreen() {
  return (
    <View style={styles.centeredContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>⏰</Text>
      </View>
      <Text style={styles.expiredTitle}>Link Expired</Text>
      <Text style={styles.expiredDesc}>
        This payment link has expired. Ask the bill owner to resend your invite to get a new link.
      </Text>
    </View>
  );
}

// ─── Success State ───────────────────────────────────────────────────────────

function SuccessScreen({ amount, billTitle }) {
  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 108, 92, 0.12)' }]}>
        <Text style={styles.iconEmoji}>✓</Text>
      </View>
      <Text style={styles.successTitle}>Payment Complete</Text>
      <Text style={styles.successDesc}>
        {formatMoney(amount)} for {billTitle || 'your bill'} has been processed. You can close this page.
      </Text>
    </View>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorScreen({ message, onRetry }) {
  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.iconCircle, { backgroundColor: colors.errorContainer }]}>
        <Text style={styles.iconEmoji}>!</Text>
      </View>
      <Text style={styles.errorTitle}>Payment Failed</Text>
      <Text style={styles.errorDesc}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.85}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Receipt Breakdown ───────────────────────────────────────────────────────

function ReceiptCard({ paymentInfo }) {
  const items = paymentInfo.items || [];
  const subtotal = parseFloat(paymentInfo.amount ?? 0);
  const tax = parseFloat(paymentInfo.tax ?? 0);
  const serviceFee = parseFloat(paymentInfo.service_fee ?? 0);
  const total = parseFloat(paymentInfo.total ?? subtotal);

  return (
    <View style={styles.receiptCard}>
      {items.length > 0 && items.map((item, i) => (
        <View key={`${item.name}-${i}`} style={styles.lineItem}>
          <Text style={styles.lineItemName}>{item.name || 'Item'}</Text>
          <Text style={styles.lineItemPrice}>{formatMoney(item.amount)}</Text>
        </View>
      ))}

      {items.length > 0 && <View style={styles.divider} />}

      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Subtotal</Text>
        <Text style={styles.breakdownValue}>{formatMoney(subtotal)}</Text>
      </View>
      {tax > 0 && (
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Tax</Text>
          <Text style={styles.breakdownValue}>{formatMoney(tax)}</Text>
        </View>
      )}
      {serviceFee > 0 && (
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Service Fee</Text>
          <Text style={styles.breakdownValue}>{formatMoney(serviceFee)}</Text>
        </View>
      )}

      <View style={styles.dashedDivider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
      </View>
    </View>
  );
}

// ─── Stripe Checkout Form (web only) ────────────────────────────────────────

function CheckoutForm({ amount, billTitle, clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);

  useEffect(() => {
    if (!stripe || !PaymentRequestButtonElement) return;

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents <= 0) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: billTitle || 'SPLTR Payment', amount: amountCents },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) setPaymentRequest(pr);
    });

    pr.on('paymentmethod', async (ev) => {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false },
      );

      if (confirmError) {
        ev.complete('fail');
        onError(confirmError.message || 'Payment failed.');
      } else if (paymentIntent.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
        if (actionError) {
          ev.complete('fail');
          onError(actionError.message || 'Authentication failed.');
        } else {
          ev.complete('success');
          onSuccess();
        }
      } else {
        ev.complete('success');
        onSuccess();
      }
    });
  }, [stripe, amount, billTitle, clientSecret, onSuccess, onError]);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <View style={styles.checkoutForm}>
      {paymentRequest && (
        <View style={styles.walletSection}>
          <PaymentRequestButtonElement options={{ paymentRequest }} />
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or pay with card</Text>
            <View style={styles.orLine} />
          </View>
        </View>
      )}
      <PaymentElement />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSubmit}
        disabled={processing || !stripe}
        style={[styles.payButton, (processing || !stripe) && { opacity: 0.6 }]}
      >
        {processing ? (
          <ActivityIndicator color={colors.onSecondary} />
        ) : (
          <Text style={styles.payButtonText}>Pay {formatMoney(amount)}</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.securedText}>Payments processed securely via Stripe</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PayPublicScreen({ route }) {
  const token = route?.params?.token;

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState(null);

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);
    setExpired(false);
    try {
      const res = await payPublic.getPaymentInfo(token);
      setPaymentInfo(res.data ?? res);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code;
      if (status === 410 || code === 'TOKEN_EXPIRED') {
        setExpired(true);
      } else {
        setFetchError(err?.response?.data?.error?.message || 'Could not load payment details.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  if (!IS_WEB) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.fallbackText}>
          Open this link in a web browser to complete your payment.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>SPLTR</Text>
          </View>
          <ExpiredScreen />
        </ScrollView>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>SPLTR</Text>
          </View>
          <ErrorScreen message={fetchError} onRetry={fetchInfo} />
        </ScrollView>
      </View>
    );
  }

  if (paySuccess) {
    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>SPLTR</Text>
          </View>
          <SuccessScreen
            amount={paymentInfo?.total ?? paymentInfo?.amount}
            billTitle={paymentInfo?.bill_title}
          />
        </ScrollView>
      </View>
    );
  }

  if (payError) {
    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>SPLTR</Text>
          </View>
          <ErrorScreen
            message={payError}
            onRetry={() => setPayError(null)}
          />
        </ScrollView>
      </View>
    );
  }

  const clientSecret = paymentInfo?.stripe_client_secret;
  const billTitle = paymentInfo?.bill_title || 'Your Bill';
  const totalAmount = paymentInfo?.total ?? paymentInfo?.amount;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SPLTR</Text>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Text style={{ fontSize: 28 }}>💳</Text>
          </View>
          <Text style={styles.heroTitle}>{billTitle}</Text>
          <Text style={styles.heroSubtitle}>Pay your share securely below</Text>
        </View>

        <ReceiptCard paymentInfo={paymentInfo} />

        {clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              amount={totalAmount}
              billTitle={billTitle}
              clientSecret={clientSecret}
              onSuccess={() => setPaySuccess(true)}
              onError={(msg) => setPayError(msg)}
            />
          </Elements>
        ) : (
          <View style={styles.noStripeCard}>
            <Text style={styles.noStripeText}>
              {!STRIPE_PK
                ? 'Stripe is not configured. Contact the bill owner.'
                : 'Unable to load payment form.'}
            </Text>
          </View>
        )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },

  header: {
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.secondary,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  receiptCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: 24,
    marginBottom: 24,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  lineItemName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
  },
  lineItemPrice: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerLow,
    marginVertical: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  breakdownValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 14,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  totalAmount: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.secondary,
  },

  checkoutForm: {
    marginBottom: 24,
  },
  walletSection: {
    marginBottom: 8,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
  },
  orText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginHorizontal: 14,
  },
  payButton: {
    marginTop: 20,
    backgroundColor: colors.secondary,
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSecondary,
  },
  securedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.outlineVariant,
    textAlign: 'center',
    marginTop: 12,
  },

  noStripeCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: 'center',
  },
  noStripeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  centeredContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 28,
  },
  expiredTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 10,
  },
  expiredDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  successTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  successDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  errorTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radii.full,
  },
  retryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSecondary,
  },

  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 16,
  },
  fallbackText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
});
