/**
 * Ramen Jin Flavors - Payment Configuration
 * PCI DSS-Compliant Payment Integration Configuration
 * 
 * SECURITY NOTES:
 * - NEVER store raw card data on the server
 * - All card data is handled via Stripe Elements (hosted fields)
 * - All API keys below are TEST/SANDBOX keys
 * - Replace with production keys ONLY in secure environment variables
 * - NEVER commit production keys to version control
 * PCI DSS Compliance Level: SAQ A (Card data never touches our servers)
 */

const PaymentConfig = {
  stripe: {
    publishableKey: 'pk_test_51TOIV4JwuGici0VYNUMjcPVEAw9eWIHzddOAkdtJ1TUKZdaQIHk6qR3KPplV9tQ9YwzfOxRnUFiuUAU07ggcnAJ900qgXy3XKw',
    apiVersion: '2024-12-18.acacia',
    elementsAppearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#D4451A',
        colorBackground: '#1a1a2e',
        colorText: '#ffffff',
        colorDanger: '#ff4444',
        fontFamily: '"Noto Sans JP", "Helvetica Neue", Helvetica, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
        fontSizeBase: '16px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#16213e',
          border: '1px solid #333',
          color: '#ffffff',
          padding: '12px',
        },
        '.Input:focus': {
          borderColor: '#D4451A',
          boxShadow: '0 0 0 2px rgba(212, 69, 26, 0.2)',
        },
        '.Label': { color: '#cccccc', fontSize: '14px', fontWeight: '500' },
        '.Error': { color: '#ff4444', fontSize: '13px' },
      },
    },
    paymentElementOptions: {
      layout: { type: 'tabs', defaultCollapsed: false },
      business: { name: 'Ramen Jin Flavors' },
    },
    paymentMethods: ['card'],
    currency: 'usd',
    statementDescriptor: 'RAMEN JIN FLAVORS',
  },
    linkCustomization: { webhook: '' },

  security: {
    csp: {
      'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
      'script-src': ['https://js.stripe.com'],
      'connect-src': ['https://api.stripe.com'],
    },
    requireHTTPS: true,
    tokenExpiration: 30,
    rateLimit: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
    encryption: { algorithm: 'aes-256-gcm', keyDerivation: 'pbkdf2', iterations: 100000 },
  },

  business: {
    name: 'Ramen Jin Flavors',
    currency: 'USD',
    country: 'US',
    state: 'TX',
    taxRate: 0.0825,
    minAmount: 100,
    maxAmount: 100000,
    refundPolicy: { allowRefunds: true, refundWindowDays: 30, partialRefunds: true },
  },

  getEnvironment() {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
      if (hostname.includes('staging') || hostname.includes('test')) return 'staging';
    }
    return 'production';
  },
  isProduction() { return this.getEnvironment() === 'production'; },
  isDevelopment() { return this.getEnvironment() === 'development'; },
};

if (typeof Object.freeze === 'function') {
  Object.freeze(PaymentConfig);
  Object.freeze(PaymentConfig.stripe);
  Object.freeze(PaymentConfig.security);
  Object.freeze(PaymentConfig.business);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentConfig;
}
