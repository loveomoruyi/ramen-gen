/**
 * Ramen Jin POS — Stripe Webhook Handler (with Firebase Admin / Firestore)
 * 
 * Netlify Function: Handles Stripe webhook events and persists order data to Firestore.
 * This replaces the original handle-webhook.js that only console.logged events.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Firebase Admin SDK initialization
let admin;
let db;

try {
  admin = require('firebase-admin');

  if (!admin.apps.length) {
    // Initialize with project ID (uses Application Default Credentials or env vars)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'ramen-jin-pos'
    });
  }

  db = admin.firestore();
  console.log('🔥 Firebase Admin initialized in webhook handler');
} catch (error) {
  console.error('⚠️ Firebase Admin initialization failed:', error.message);
}

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    if (webhookSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } else {
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' })
    };
  }

  console.log('📨 Webhook event received:', stripeEvent.type);

  try {
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(stripeEvent.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(stripeEvent.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(stripeEvent.data.object);
        break;

      default:
        console.log('ℹ️ Unhandled event type:', stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};

/**
 * Handle successful payment — store order and payment record in Firestore
 */
async function handlePaymentSuccess(paymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id, '- Amount:', paymentIntent.amount);

  if (!db) {
    console.warn('⚠️ Firestore not available — skipping database operations');
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const today = new Date().toISOString().split('T')[0];
  const metadata = paymentIntent.metadata || {};

  try {
    // Save payment record
    await db.collection('payments').add({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert cents to dollars
      currency: paymentIntent.currency || 'usd',
      status: 'succeeded',
      customerEmail: paymentIntent.receipt_email || metadata.customerEmail || '',
      metadata: metadata,
      createdAt: now,
      date: today
    });

    console.log('✅ Payment record saved to Firestore');

    // Update daily sales aggregate
    const dailySalesRef = db.collection('daily_sales').doc(today);
    const orderTotal = paymentIntent.amount / 100;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(dailySalesRef);

      if (doc.exists) {
        const data = doc.data();
        const newOrderCount = (data.orderCount || 0) + 1;
        const newTotalRevenue = (data.totalRevenue || 0) + orderTotal;

        transaction.update(dailySalesRef, {
          totalRevenue: newTotalRevenue,
          orderCount: newOrderCount,
          avgOrderValue: Math.round((newTotalRevenue / newOrderCount) * 100) / 100,
          lastUpdated: now
        });
      } else {
        transaction.set(dailySalesRef, {
          date: today,
          totalRevenue: orderTotal,
          orderCount: 1,
          itemCount: 0,
          avgOrderValue: orderTotal,
          lastUpdated: now
        });
      }
    });

    console.log('✅ Daily sales updated from webhook');
  } catch (error) {
    console.error('❌ Error in handlePaymentSuccess:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);

  if (!db) return;

  try {
    await db.collection('payments').add({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency || 'usd',
      status: 'failed',
      failureMessage: paymentIntent.last_payment_error
        ? paymentIntent.last_payment_error.message
        : 'Unknown failure',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('❌ Error recording failed payment:', error);
  }
}

/**
 * Handle refund
 */
async function handleRefund(charge) {
  console.log('💰 Refund processed:', charge.id);

  if (!db) return;

  try {
    await db.collection('payments').add({
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
      amount: charge.amount_refunded / 100,
      currency: charge.currency || 'usd',
      status: 'refunded',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    });

    // Update daily sales to subtract refunded amount
    const today = new Date().toISOString().split('T')[0];
    const dailySalesRef = db.collection('daily_sales').doc(today);
    const refundAmount = charge.amount_refunded / 100;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(dailySalesRef);
      if (doc.exists) {
        transaction.update(dailySalesRef, {
          totalRevenue: (doc.data().totalRevenue || 0) - refundAmount,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error('❌ Error recording refund:', error);
  }
}
