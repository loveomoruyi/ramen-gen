/**
 * Ramen Jin POS — Firestore Service Module
 * 
 * Provides all Firestore database operations:
 * - Order storage and retrieval
 * - Customer tracking
 * - Real-time admin portal data
 * - Sales analytics
 * - Receipt management
 * 
 * Requires: firebase-config.js to be loaded first (provides `db` global)
 */

const FirestoreService = (function () {
  'use strict';

  // ============================================================
  // COLLECTION REFERENCES
  // ============================================================
  const COLLECTIONS = {
    ORDERS: 'orders',
    CUSTOMERS: 'customers',
    DAILY_SALES: 'daily_sales',
    PAYMENTS: 'payments',
    RECEIPTS: 'receipts',
    ADMIN_CONFIG: 'admin_config'
  };

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Generate a unique order number: RJ-YYYYMMDD-XXXX
   */
  function generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'RJ-' + dateStr + '-' + random;
  }

  // ============================================================
  // ORDER MANAGEMENT
  // ============================================================

  /**
   * Save a new order to Firestore
   * @param {Object} orderData - Order details
   * @param {Array} orderData.items - Array of cart items [{name, price, quantity, category}]
   * @param {number} orderData.subtotal - Order subtotal
   * @param {number} orderData.tax - Tax amount
   * @param {number} orderData.total - Order total
   * @param {string} orderData.paymentIntentId - Stripe payment intent ID
   * @param {Object} orderData.customer - Customer info {name, email, phone}
   * @param {string} orderData.orderType - 'dine-in', 'takeout', or 'delivery'
   * @returns {Promise<Object>} - The saved order with its Firestore document ID
   */
  async function saveOrder(orderData) {
    try {
      const orderNumber = generateOrderNumber();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      const order = {
        orderNumber: orderNumber,
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        total: orderData.total || 0,
        paymentIntentId: orderData.paymentIntentId || null,
        paymentStatus: 'completed',
        orderStatus: 'received',
        orderType: orderData.orderType || 'dine-in',
        customer: orderData.customer || {},
        notes: orderData.notes || '',
        createdAt: now,
        updatedAt: now,
        date: getTodayString(),
        itemCount: (orderData.items || []).reduce(function (sum, item) {
          return sum + (item.quantity || 1);
        }, 0)
      };

      var docRef = await db.collection(COLLECTIONS.ORDERS).add(order);
      console.log('✅ Order saved:', orderNumber, '(ID:', docRef.id, ')');

      // Update daily sales aggregate
      await updateDailySales(order.total, order.itemCount);

      // Track customer if info provided
      if (order.customer && order.customer.email) {
        await trackCustomer(order.customer, order.total, docRef.id);
      }

      return Object.assign({}, order, {
        id: docRef.id,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('❌ Error saving order:', error);
      throw error;
    }
  }

  /**
   * Get a single order by ID
   */
  async function getOrder(orderId) {
    try {
      var doc = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get();
      if (doc.exists) {
        return Object.assign({ id: doc.id }, doc.data());
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get order by order number (e.g., RJ-20260424-A1B2)
   */
  async function getOrderByNumber(orderNumber) {
    try {
      var snapshot = await db.collection(COLLECTIONS.ORDERS)
        .where('orderNumber', '==', orderNumber)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        var doc = snapshot.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Get today's orders
   */
  async function getTodaysOrders() {
    try {
      var snapshot = await db.collection(COLLECTIONS.ORDERS)
        .where('date', '==', getTodayString())
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
    } catch (error) {
      console.error('❌ Error getting today\'s orders:', error);
      throw error;
    }
  }

  /**
   * Get orders within a date range
   */
  async function getOrdersByDateRange(startDate, endDate) {
    try {
      var snapshot = await db.collection(COLLECTIONS.ORDERS)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
    } catch (error) {
      console.error('❌ Error getting orders by date range:', error);
      throw error;
    }
  }

  /**
   * Update order status (received → preparing → ready → completed)
   */
  async function updateOrderStatus(orderId, newStatus) {
    try {
      await db.collection(COLLECTIONS.ORDERS).doc(orderId).update({
        orderStatus: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Order', orderId, 'status updated to:', newStatus);
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  // ============================================================
  // REAL-TIME LISTENERS (for Admin Portal & Kitchen Display)
  // ============================================================

  /**
   * Listen for real-time order updates (today's orders)
   * @param {Function} callback - Called with array of orders on each update
   * @returns {Function} unsubscribe - Call to stop listening
   */
  function listenToTodaysOrders(callback) {
    return db.collection(COLLECTIONS.ORDERS)
      .where('date', '==', getTodayString())
      .orderBy('createdAt', 'desc')
      .onSnapshot(function (snapshot) {
        var orders = snapshot.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
        callback(orders);
      }, function (error) {
        console.error('❌ Real-time orders listener error:', error);
      });
  }

  /**
   * Listen for active orders (not completed/cancelled — for Kitchen Display)
   * @param {Function} callback - Called with array of active orders
   * @returns {Function} unsubscribe
   */
  function listenToActiveOrders(callback) {
    return db.collection(COLLECTIONS.ORDERS)
      .where('date', '==', getTodayString())
      .where('orderStatus', 'in', ['received', 'preparing', 'ready'])
      .orderBy('createdAt', 'asc')
      .onSnapshot(function (snapshot) {
        var orders = snapshot.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
        callback(orders);
      }, function (error) {
        console.error('❌ Active orders listener error:', error);
      });
  }

  /**
   * Listen for real-time daily sales summary
   * @param {Function} callback - Called with sales data object
   * @returns {Function} unsubscribe
   */
  function listenToDailySales(callback) {
    var today = getTodayString();
    return db.collection(COLLECTIONS.DAILY_SALES).doc(today)
      .onSnapshot(function (doc) {
        if (doc.exists) {
          callback(doc.data());
        } else {
          callback({
            date: today,
            totalRevenue: 0,
            orderCount: 0,
            itemCount: 0,
            avgOrderValue: 0
          });
        }
      }, function (error) {
        console.error('❌ Daily sales listener error:', error);
      });
  }

  // ============================================================
  // DAILY SALES AGGREGATION
  // ============================================================

  /**
   * Update daily sales aggregate when a new order is placed
   */
  async function updateDailySales(orderTotal, itemCount) {
    try {
      var today = getTodayString();
      var docRef = db.collection(COLLECTIONS.DAILY_SALES).doc(today);

      await db.runTransaction(async function (transaction) {
        var doc = await transaction.get(docRef);

        if (doc.exists) {
          var data = doc.data();
          var newOrderCount = (data.orderCount || 0) + 1;
          var newTotalRevenue = (data.totalRevenue || 0) + orderTotal;

          transaction.update(docRef, {
            totalRevenue: newTotalRevenue,
            orderCount: newOrderCount,
            itemCount: (data.itemCount || 0) + itemCount,
            avgOrderValue: Math.round((newTotalRevenue / newOrderCount) * 100) / 100,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(docRef, {
            date: today,
            totalRevenue: orderTotal,
            orderCount: 1,
            itemCount: itemCount,
            avgOrderValue: orderTotal,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      console.log('✅ Daily sales updated for', today);
    } catch (error) {
      console.error('❌ Error updating daily sales:', error);
    }
  }

  // ============================================================
  // CUSTOMER TRACKING
  // ============================================================

  /**
   * Track customer information and order history
   */
  async function trackCustomer(customerInfo, orderTotal, orderId) {
    try {
      var email = customerInfo.email.toLowerCase().trim();
      var customerRef = db.collection(COLLECTIONS.CUSTOMERS).doc(email);

      await db.runTransaction(async function (transaction) {
        var doc = await transaction.get(customerRef);

        if (doc.exists) {
          // Returning customer — update stats
          var data = doc.data();
          transaction.update(customerRef, {
            name: customerInfo.name || data.name,
            phone: customerInfo.phone || data.phone,
            totalOrders: (data.totalOrders || 0) + 1,
            totalSpent: (data.totalSpent || 0) + orderTotal,
            orderIds: firebase.firestore.FieldValue.arrayUnion(orderId),
            lastOrderDate: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // New customer
          transaction.set(customerRef, {
            email: email,
            name: customerInfo.name || '',
            phone: customerInfo.phone || '',
            totalOrders: 1,
            totalSpent: orderTotal,
            orderIds: [orderId],
            firstOrderDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastOrderDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      console.log('✅ Customer tracked:', email);
    } catch (error) {
      console.error('❌ Error tracking customer:', error);
    }
  }

  /**
   * Get customer by email
   */
  async function getCustomer(email) {
    try {
      var doc = await db.collection(COLLECTIONS.CUSTOMERS)
        .doc(email.toLowerCase().trim())
        .get();

      if (doc.exists) {
        return Object.assign({ id: doc.id }, doc.data());
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting customer:', error);
      throw error;
    }
  }

  /**
   * Get all customers (for admin CRM view)
   */
  async function getAllCustomers() {
    try {
      var snapshot = await db.collection(COLLECTIONS.CUSTOMERS)
        .orderBy('totalSpent', 'desc')
        .get();

      return snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
    } catch (error) {
      console.error('❌ Error getting customers:', error);
      throw error;
    }
  }

  // ============================================================
  // PAYMENT RECORDS
  // ============================================================

  /**
   * Save payment record linked to an order
   */
  async function savePaymentRecord(paymentData) {
    try {
      var record = {
        paymentIntentId: paymentData.paymentIntentId,
        orderId: paymentData.orderId || null,
        amount: paymentData.amount,
        currency: paymentData.currency || 'usd',
        status: paymentData.status || 'succeeded',
        paymentMethod: paymentData.paymentMethod || 'card',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        date: getTodayString()
      };

      var docRef = await db.collection(COLLECTIONS.PAYMENTS).add(record);
      console.log('✅ Payment record saved:', docRef.id);
      return Object.assign({ id: docRef.id }, record);
    } catch (error) {
      console.error('❌ Error saving payment record:', error);
      throw error;
    }
  }

  // ============================================================
  // RECEIPT MANAGEMENT
  // ============================================================

  /**
   * Save receipt data (for receipt lookup/reprinting)
   */
  async function saveReceipt(receiptData) {
    try {
      var receipt = {
        orderNumber: receiptData.orderNumber,
        orderId: receiptData.orderId,
        items: receiptData.items,
        subtotal: receiptData.subtotal,
        tax: receiptData.tax,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod || 'card',
        customerEmail: receiptData.customerEmail || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        date: getTodayString()
      };

      var docRef = await db.collection(COLLECTIONS.RECEIPTS).add(receipt);
      console.log('✅ Receipt saved:', docRef.id);
      return Object.assign({ id: docRef.id }, receipt);
    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by order number
   */
  async function getReceiptByOrderNumber(orderNumber) {
    try {
      var snapshot = await db.collection(COLLECTIONS.RECEIPTS)
        .where('orderNumber', '==', orderNumber)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        var doc = snapshot.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting receipt:', error);
      throw error;
    }
  }

  // ============================================================
  // ADMIN DASHBOARD DATA
  // ============================================================

  /**
   * Get dashboard summary for admin portal
   * Returns today's stats + recent orders
   */
  async function getDashboardSummary() {
    try {
      var today = getTodayString();

      // Get daily sales
      var salesDoc = await db.collection(COLLECTIONS.DAILY_SALES).doc(today).get();
      var sales = salesDoc.exists ? salesDoc.data() : {
        totalRevenue: 0,
        orderCount: 0,
        itemCount: 0,
        avgOrderValue: 0
      };

      // Get recent orders (last 20)
      var ordersSnapshot = await db.collection(COLLECTIONS.ORDERS)
        .where('date', '==', today)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      var recentOrders = ordersSnapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });

      // Get active orders count
      var activeCount = recentOrders.filter(function (o) {
        return ['received', 'preparing', 'ready'].indexOf(o.orderStatus) !== -1;
      }).length;

      return {
        sales: sales,
        recentOrders: recentOrders,
        activeOrderCount: activeCount,
        date: today
      };
    } catch (error) {
      console.error('❌ Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get sales data for a date range (for sales charts/reports)
   */
  async function getSalesReport(startDate, endDate) {
    try {
      var snapshot = await db.collection(COLLECTIONS.DAILY_SALES)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
    } catch (error) {
      console.error('❌ Error getting sales report:', error);
      throw error;
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    // Collections reference
    COLLECTIONS: COLLECTIONS,

    // Order management
    saveOrder: saveOrder,
    getOrder: getOrder,
    getOrderByNumber: getOrderByNumber,
    getTodaysOrders: getTodaysOrders,
    getOrdersByDateRange: getOrdersByDateRange,
    updateOrderStatus: updateOrderStatus,

    // Real-time listeners
    listenToTodaysOrders: listenToTodaysOrders,
    listenToActiveOrders: listenToActiveOrders,
    listenToDailySales: listenToDailySales,

    // Customer tracking
    trackCustomer: trackCustomer,
    getCustomer: getCustomer,
    getAllCustomers: getAllCustomers,

    // Payments
    savePaymentRecord: savePaymentRecord,

    // Receipts
    saveReceipt: saveReceipt,
    getReceiptByOrderNumber: getReceiptByOrderNumber,

    // Admin/Dashboard
    getDashboardSummary: getDashboardSummary,
    getSalesReport: getSalesReport,

    // Utilities
    generateOrderNumber: generateOrderNumber
  };
})();

console.log('📦 FirestoreService loaded');
