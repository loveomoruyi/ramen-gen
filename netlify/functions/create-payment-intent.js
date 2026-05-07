exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY environment variable is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Payment service configuration error. Please contact support.' })
    };
  }

  // Initialize Stripe inside handler to catch initialization errors
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    // Parse body - handle both string and already-parsed body
    let body;
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else {
      body = event.body || {};
    }

    const { amount, currency = 'usd', metadata = {} } = body;

    // Validate amount
    if (!amount || amount < 100 || amount > 10000000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amount. Must be between $1.00 and $100,000.00' })
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        business: 'Ramen Jin Flavors',
        integration: 'stripe_elements',
        ...metadata
      },
      statement_descriptor_suffix: 'RAMEN JIN'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      })
    };
  } catch (error) {
    console.error('Payment intent creation failed:', error.message || error);

    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Payment service authentication error. Please contact support.' })
      };
    }

    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message || 'Card error occurred.' })
      };
    }

    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payment request. Please check your details.' })
      };
    }

    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body. Expected JSON.' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Payment processing failed. Please try again.' })
    };
  }
};
