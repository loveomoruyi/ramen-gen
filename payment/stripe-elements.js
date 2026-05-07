/**
 * Ramen Jin Flavors - Stripe Elements Integration
 * PCI DSS-Compliant Card Payment Handling
 *
 * This module implements Stripe Elements (hosted fields) to ensure
 * that raw card data NEVER touches our servers. All card input is
 * rendered in Stripe-hosted iframes, maintaining SAQ A compliance.
 *
 * Security Features:
 * - Card data collected in Stripe-hosted iframes (never on our server)
 * - Payment intents created server-side only
 * - Client-side token/PaymentMethod used instead of raw card numbers
 * - HTTPS enforced for all Stripe communications
 */

class StripePaymentHandler {
  constructor(config) {
    this.config = config || (typeof PaymentConfig !== 'undefined' ? PaymentConfig : {});
    this.stripe = null;
    this.elements = null;
    this.paymentElement = null;
    this.cardElement = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this._clientSecret = null;
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Initialize Stripe with publishable key
   * @param {string} publishableKey - Stripe publishable key
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(publishableKey, options = {}) {
    try {
      if (this.config.security?.requireHTTPS &&
          window.location.protocol !== 'https:' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1') {
        throw new Error('HTTPS is required for payment processing');
      }
      if (!window.Stripe) { await this._loadStripeJS(); }
      const key = publishableKey || this.config.stripe?.publishableKey;
      if (!key || key.includes('REPLACE_WITH')) {
        console.warn('[Stripe] Using placeholder key. Replace with actual key.');
        return false;
      }

      this.stripe = window.Stripe(key, {
        apiVersion: this.config.stripe?.apiVersion || '2024-12-18.acacia',
        locale: 'en',
      });
      console.log('[Stripe] Initialized successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[Stripe] Initialization failed:', error.message);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Dynamically load Stripe.js SDK
   * @private
   * @returns {Promise<void>}
   */
  _loadStripeJS() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="js.stripe.com"]')) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Mount Stripe Payment Element (supports multiple payment methods)
   * @param {string} containerId - DOM element ID to mount into
   * @param {string} clientSecret - PaymentIntent client secret
   * @param {Object} options - Additional mount options
   * @returns {Promise<Object>} The mounted payment element
   */
  async mountPaymentElement(containerId, clientSecret, options = {}) {
    if (!this.isInitialized) throw new Error('Stripe must be initialized first');
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container element #' + containerId + ' not found');
    try {
      this._clientSecret = clientSecret;
      this.elements = this.stripe.elements({
        clientSecret: clientSecret,
        appearance: this.config.stripe?.elementsAppearance || { theme: 'stripe' },
        loader: 'auto',
      });
      this.paymentElement = this.elements.create('payment', {
        layout: options.layout || { type: 'tabs' },
        business: { name: 'Ramen Jin Flavors' },
        fields: { billingDetails: { name: 'auto', email: 'auto' } },
      });
      this.paymentElement.mount('#' + containerId);
      this.paymentElement.on('change', (event) => {
        if (event.error) this.displayError(event.error.message);
        else this.clearError();
      });
      this.paymentElement.on('ready', () => {
        console.log('[Stripe] Payment Element ready');
        container.classList.add('stripe-element-ready');
      });
      console.log('[Stripe] Payment Element mounted successfully');
      return this.paymentElement;
    } catch (error) {
      console.error('[Stripe] Failed to mount Payment Element:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Mount Stripe Card Element (card-only input)
   * @param {string} containerId - DOM element ID to mount into
   * @returns {Promise<Object>} The mounted card element
   */
  async mountCardElement(containerId) {
    if (!this.isInitialized) throw new Error('Stripe must be initialized first');
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container #' + containerId + ' not found');
    try {
      this.elements = this.stripe.elements({
        appearance: this.config.stripe?.elementsAppearance || { theme: 'stripe' },
      });
      this.cardElement = this.elements.create('card', {
        style: {
          base: { fontSize: '16px', color: '#ffffff', backgroundColor: '#16213e',
            fontFamily: '"Noto Sans JP", sans-serif', '::placeholder': { color: '#666' } },
          invalid: { color: '#ff4444', iconColor: '#ff4444' },
        },
        hidePostalCode: false,
      });
      this.cardElement.mount('#' + containerId);
      this.cardElement.on('change', (event) => {
        if (event.error) this.displayError(event.error.message);
        else this.clearError();
      });
      console.log('[Stripe] Card Element mounted');
      return this.cardElement;
    } catch (error) {
      console.error('[Stripe] Failed to mount Card Element!', error);
      throw error;
    }
  }

  /**
   * Handle payment form submission
   * Confirms the payment with Stripe using the mounted element
   *
   * @param {Object} billingDetails - Customer billing information
   * @param {string} returnUrl - URL to redirect after payment
   * @returns {Promise<Object>} Payment result {success, paymentIntentId, error}
   */
  async handleSubmit(billingDetails = {}, returnUrl = '') {
    if (this.isProcessing) return { success: false, error: 'Payment already processing' };
    this.isProcessing = true;
    this.setLoadingState(true);
    try {
      let result;
      if (this.paymentElement) {
        result = await this.stripe.confirmPayment({
          elements: this.elements,
          confirmParams: {
            return_url: returnUrl || window.location.origin + '/pages/receipt.html',
            payment_method_data: {
              billing_details: {
                name: billingDetails.name || '',
                email: billingDetails.email || '',
                phone: billingDetails.phone || '',
                address: {
                  line1: billingDetails.address?.line1 || '',
                  city: billingDetails.address?.city || '',
                  state: billingDetails.address?.state || 'TX',
                  postal_code: billingDetails.address?.postalCode || '',
                  country: billingDetails.address?.country || 'US',
                },
              },
            },
          },
          redirect: 'if_required',
        });
      } else if (this.cardElement) {
        result = await this.stripe.confirmCardPayment(this._clientSecret, {
          payment_method: { card: this.cardElement, billing_details: billingDetails },
        });
      } else { throw new Error('No payment element mounted'); }
      if (result.error) {
        this.handleError(result.error);
        return { success: false, error: result.error.message };
      }
      if (result.paymentIntent) {
        console.log('[Stripe] Payment successful:', result.paymentIntent.id);
        this._showSuccessMessage(result.paymentIntent);
        return { success: true, paymentIntentId: result.paymentIntent.id,
          status: result.paymentIntent.status, amount: result.paymentIntent.amount };
      }
      return { success: true, result };
    } catch (error) {
      console.error('[Stripe] Payment failed!', error);
      this.handleError(error);
      return { success: false, error: error.message };
    } finally {
      this.isProcessing = false;
      this.setLoadingState(false);
    }
  }

  /**
   * Create a PaymentIntent via server-side API
   * Amount is in cents (e.g., 1000 = $10.00)
   *
   * @param {number} amount - Payment amount in cents
   * @param {string} currency - Currency code (default: 'usd')
   * @returns {Promise<Object>} PaymentIntent data with clientSecret
   */
  async createPaymentIntent(amount, currency = 'usd') {
    console.log('[Stripe] Creating PaymentIntent server-side');
    try {
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, metadata: { business: 'Ramen Jin Flavors' } }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create payment intent');
      }
      const data = await response.json();
      this._clientSecret = data.clientSecret;
      return data;
    } catch (error) {
      console.warn('[Stripe] Server not available. Using mock for dev.');
      return { clientSecret: 'pi_mock_secret', paymentIntentId: 'pi_mock_' + Date.now(), amount, currency };
    }
  }

  /**
   * Calculate total with Texas tax rate
   * @param {number} subtotal - Subtotal in cents
   * @returns {Object} Breakdown with subtotal, tax, and total
   */
  calculateTotal(subtotal) {
    const taxRate = this.config.business?.taxRate || 0.0825;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;
    return { subtotal, tax, taxRate, total };
  }

  /**
   * Display error message in the UI
   * @param {string} message - Error message to display
   */
  displayError(message) {
    const el = document.getElementById('stripe-error-message') || document.getElementById('payment-error');
    if (el) { el.textContent = message; el.style.display = 'block'; el.setAttribute('role', 'alert'); }
  }

  /**
   * Clear error messages from the UI
   */
  clearError() {
    const el = document.getElementById('stripe-error-message') || document.getElementById('payment-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }

  /**
   * Handle and display payment errors
   * @param {Object} error - Error object from Stripe
   */
  handleError(error) {
    const message = error.message || error.decline_code || 'An unexpected error occurred';
    console.error('[Stripe] Error: ', message);
    this.displayError(message);
  }

  /**
   * Show success message after successful payment
   * @param {Object} paymentIntent - Stripe PaymentIntent object
   * @private
   */
  _showSuccessMessage(paymentIntent) {
    const successEl = document.getElementById('payment-success') || document.getElementById('stripe-success-message');
    if (successEl) {
      const amount = (paymentIntent.amount / 100).toFixed(2);
      successEl.innerHTML = '<div class="success-icon">&#10003;</div>' +
        '<p>Payment of $' + amount + ' was successful!</p>' +
        '<p class="payment-id">ID: ' + paymentIntent.id + '</p>';
      successEl.style.display = 'block';
      successEl.setAttribute('role', 'status');
    }
    // Hide the payment form
    const form = document.getElementById('payment-form') || document.getElementById('stripe-payment-form');
    if (form) form.style.display = 'none';
  }

  /**
   * Toggle loading state on submit button
   * @param {boolean} isLoading - Whether payment is processing
   */
  setLoadingState(isLoading) {
    const btn = document.getElementById('payment-submit-btn') || document.getElementById('submit-payment');
    if (btn) { btn.disabled = isLoading; btn.textContent = isLoading ? 'Processing...' : 'Pay Now'; }
    const spinner = document.getElementById('payment-spinner');
    if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  }

  /**
   * Destroy payment elements and clean up resources
   */
  destroy() {
    if (this.paymentElement) { this.paymentElement.destroy(); this.paymentElement = null; }
    if (this.cardElement) { this.cardElement.destroy(); this.cardElement = null; }
    this.elements = null;
    this._clientSecret = null;
    this.isInitialized = false;
    this.isProcessing = false;
    console.log('[Stripe] Payment handler destroyed');
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) { module.exports = StripePaymentHandler; }
