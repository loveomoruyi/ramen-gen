# Ramen Jin Flavors - PCI DSS Compliance Documentation

## Payment Security Architecture

**Date:** April 20, 2026  
**Version:** 1.0  
**Business:** Ramen Jin Flavors  
**Compliance Level:** PCI DSS SAQ A  

---

## 1. Overview

Ramen Jin Flavors implements a hybrid payment solution using:
- **Stripe Elements** (hosted fields) for credit/debit card payments
- **Plaid Link** for ACH bank account payments

This architecture ensures PCI DSS SAQ A compliance by guaranteeing that **no raw cardholder data (CHD) ever touches our servers**.

---

## 2. PCI DSS Compliance Strategy

### 2.1 SAQ A Eligibility

Our implementation qualifies for **SAQ A** (the simplest PCI DSS self-assessment) because:

| Requirement | Implementation |
|---|---|
| All payment processing outsourced to PCI-compliant providers | ✅ Stripe (PCI Level 1) and Plaid (SOC 2 Type II) |
| No electronic storage of cardholder data | ✅ Card data never reaches our server |
| No electronic processing of cardholder data | ✅ Stripe hosted iframes handle all card input |
| No electronic transmission of cardholder data | ✅ Card data goes directly from Stripe iframe to Stripe servers |
| Website served over HTTPS | ✅ TLS 1.2+ enforced |

### 2.2 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CUSTOMER BROWSER                       │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │  Our Payment     │    │  Stripe Hosted iframe     │    │
│  │  Page (HTML/JS)  │    │  (Card Number, CVV, Exp)  │    │
│  │                  │    │  ← Card data stays HERE   │    │
│  │  Order details   │    │                           │    │
│  │  Billing name    │    │  Tokenized → Stripe API   │    │
│  │  Email           │    │                           │    │
│  └────────┬─────────┘    └──────────┬───────────────┘    │
│           │                         │                     │
│           │ (non-sensitive          │ (card data goes     │
│           │  data only)             │  directly to Stripe)│
└───────────┼─────────────────────────┼─────────────────────┘
            │                         │
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│  OUR SERVER           │   │  STRIPE SERVERS       │
│                       │   │  (PCI Level 1)        │
│  - PaymentIntent ID   │   │                       │
│  - Order metadata     │   │  - Card processing    │
│  - Customer email     │   │  - Tokenization       │
│  - Amount             │   │  - Fraud detection     │
│                       │   │  - Settlement          │
│  ❌ NO card data      │   │                       │
│  ❌ NO CVV            │   │  ✅ All card data      │
│  ❌ NO card numbers   │   │  ✅ PCI compliant      │
└──────────────────────┘   └──────────────────────┘
```

### 2.3 ACH Payment Flow (Plaid)

```
┌──────────────────────────────────────────────────────────┐
│                    CUSTOMER BROWSER                       │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │  Our Payment     │    │  Plaid Link iframe        │    │
│  │  Page            │    │  (Bank login credentials) │    │
│  │                  │    │  ← Credentials stay HERE  │    │
│  └────────┬─────────┘    └──────────┬───────────────┘    │
│           │                         │                     │
└───────────┼─────────────────────────┼─────────────────────┘
            │                         │
            │ public_token            │ credentials
            ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│  OUR SERVER           │   │  PLAID SERVERS        │
│                       │   │  (SOC 2 Type II)      │
│  - Exchange token     │   │                       │
│  - access_token       │   │  - Bank authentication │
│    (encrypted)        │   │  - Account verification│
│  - Account mask only  │   │  - Token management    │
│                       │   │                       │
│  ❌ NO bank passwords │   │  ✅ All credentials    │
│  ❌ NO full account # │   │  ✅ Compliant          │
└──────────────────────┘   └──────────────────────┘
```

---

## 3. Security Controls Implemented

### 3.1 Transport Layer Security
- **TLS 1.2+** enforced for all communications
- **HSTS** headers with 1-year max-age, includeSubDomains, preload
- All API endpoints require HTTPS

### 3.2 Content Security Policy (CSP)
```
script-src: `self` https://js.stripe.com https://cdn.plaid.com
frame-src: `self` https://js.stripe.com https://hooks.stripe.com https://cdn.plaid.com
connect-src: `self` https://api.stripe.com https://production.plaid.com
```

### 3.3 Data Encryption
- **In Transit:** TLS 1.2+ for all communications
- **At Rest:** AES-256-GCM for sensitive tokens (Plaid access tokens)
- **Key Management:** Encryption keys stored in environment variables, never in code

### 3.4 Access Controls
- API keys stored in environment variables only
- Rate limiting on all payment endpoints (10 attempts per 15 minutes)
- Stricter rate limiting on token endpoints (5 per minute)
- Input validation and sanitization on all endpoints
- CORS restricted to allowed origins only

### 3.5 Webhook Security
- Stripe webhook signature verification using `stripe-signature` header
- Raw body parsing for accurate signature computation
- Event type validation before processing

### 3.6 Error Handling
- Generic error messages to clients (no internal details exposed)
- Detailed logging server-side for monitoring
- No sensitive data in logs or error responses

---

## 4. Sensitive Data Handling Policy

### What We NEVER Store:
- ❌ Full credit/debit card numbers (PAN)
- ❌ Card verification values (CVV/CVC)
- ❌ Card expiration dates
- ❌ Magnetic stripe data
- ❌ PIN/PIN blocks
- ❌ Bank login credentials
- ❌ Full bank account numbers

### What We Store (Encrypted):
- ✅ Stripe PaymentIntent IDs (for order tracking)
- ✅ Plaid access tokens (AES-256-GCM encrypted)
- ✅ Last 4 digits of card/account (for display only)
- ✅ Transaction amounts and timestamps
- ✅ Order metadata

---

## 5. Third-Party Provider Compliance

### Stripe
- **PCI DSS Level 1** certified (highest level)
- Annual on-site assessment by Qualified Security Assessor (QSA)
- SOC 2 Type II compliant
- Compliance page: https://stripe.com/docs/security/stripe

### Plaid
- **SOC 2 Type II** certified
- Annual security audits
- Bank-level encryption (AES-256)
- Compliance page: https://plaid.com/safety/

---

## 6. Incident Response

### In Case of Suspected Breach:
1. Immediately disable affected API keys in Stripe/Plaid dashboards
2. Rotate all encryption keys and secrets
3. Review server logs for unauthorized access
4. Notify affected customers within 72 hours (per GDPR/state laws)
5. File incident report with payment processor
6. Engage forensic investigator if cardholder data may be compromised

### Contact Information:
- Stripe Security: security@stripe.com
- Plaid Security: security@plaid.com

---

## 7. Compliance Checklist

- [x] Card data handled exclusively by Stripe hosted iframes
- [x] Bank credentials handled exclusively by Plaid Link
- [x] No raw cardholder data stored on our servers
- [x] No raw cardholder data transmitted through our servers
- [x] HTTPS/TLS 1.2+ enforced on all pages
- [x] CSP headers configured for payment provider domains
- [x] API keys stored in environment variables
- [x] Rate limiting on payment endpoints
- [x] Input validation and sanitization
- [x] Webhook signature verification
- [x] Sensitive tokens encrypted at rest (AES-256-GCM)
- [x] Error messages do not expose sensitive data
- [x] Regular dependency audits (npm audit)
- [ ] Annual SAQ A self-assessment questionnaire (schedule for production launch)
- [ ] Quarterly vulnerability scanning (engage ASV for production)
- [ ] Terms of Service, Privacy Policy, Refund Policy pages (pending)
- [ ] Texas LLC registration and EIN (pending for full Stripe activation)
- [ ] Texas Sales Tax Permit (pending)

---

## 8. Next Steps for Production

1. **Replace test API keys** with production keys in environment variables
2. **Complete Stripe account activation** (business verification, bank account for payouts)
3. **Complete Plaid production access** (submit application for production credentials)
4. **Register Texas LLC** and obtain EIN for business verification
5. **Obtain Texas Sales Tax Permit** for collecting 8.25% sales tax
6. **Create legal pages**: Terms of Service, Privacy Policy, Refund Policy
7. **Set up monitoring**: Error tracking, payment analytics, fraud alerts
8. **Schedule SAQ A assessment**: Annual self-assessment questionnaire
9. **Engage ASV**: Quarterly vulnerability scanning from Approved Scanning Vendor
10. **Enable Stripe Radar**: Advanced fraud detection for card payments

---

*Document maintained by Ramen Jin Flavors development team.*
*Last updated: April 20, 2026*
