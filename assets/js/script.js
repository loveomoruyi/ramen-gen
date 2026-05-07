/* ============================================
   Ramen Jin Restaurant Website - Main JavaScript
   Owner: Brian Chen
   Location: Wilcrest Street, Houston, TX
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Ramen Jin Website Loaded - Owner: Brian Chen');
    
    // Initialize all modules
    initNavigation();
    initOrderSystem();
    initPaymentProcessing();
    initReceiptManagement();
    initSalesDashboard();
});

/* ============================================
   Navigation
   ============================================ */
function initNavigation() {
    // Highlight active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        }
    });
}

/* ============================================
   Order System
   ============================================ */
function initOrderSystem() {
    // Quantity controls
    const minusBtns = document.querySelectorAll('.qty-btn.minus');
    const plusBtns = document.querySelectorAll('.qty-btn.plus');
    
    minusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.nextElementSibling;
            let val = parseInt(input.value) || 0;
            if (val > 0) {
                input.value = val - 1;
                updateOrderSummary();
            }
        });
    });
    
    plusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            let val = parseInt(input.value) || 0;
            input.value = val + 1;
            updateOrderSummary();
        });
    });
    
    // Order type buttons
    const btnPickup = document.getElementById('btn-pickup');
    const btnDelivery = document.getElementById('btn-delivery');
    
    if (btnPickup) {
        btnPickup.addEventListener('click', function() {
            this.classList.add('active');
            if (btnDelivery) btnDelivery.classList.remove('active');
        });
    }
    
    if (btnDelivery) {
        btnDelivery.addEventListener('click', function() {
            this.classList.add('active');
            if (btnPickup) btnPickup.classList.remove('active');
        });
    }
    
    // Checkout button
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', function() {
            const total = document.getElementById('total');
            if (total && total.textContent !== '$0.00') {
                window.location.href = 'payment.html';
            } else {
                alert('Please add items to your order before checking out.');
            }
        });
    }
}

function updateOrderSummary_OLD_DISABLED() {
    const orderItems = document.querySelectorAll('.order-item');
    let subtotal = 0;
    const summaryDiv = document.getElementById('summary-items');
    
    if (!summaryDiv) return;
    
    summaryDiv.innerHTML = '';
    
    orderItems.forEach(item => {
        const name = item.querySelector('h4').textContent;
        const priceText = item.querySelector('.price').textContent;
        const price = parseFloat(priceText.replace('$', ''));
        const qty = parseInt(item.querySelector('.qty-input').value) || 0;
        
        if (qty > 0) {
            const lineTotal = price * qty;
            subtotal += lineTotal;
            
            const summaryLine = document.createElement('p');
            summaryLine.textContent = name + ' x' + qty + ' - $' + lineTotal.toFixed(2);
            summaryDiv.appendChild(summaryLine);
        }
    });
    
    const tax = subtotal * 0.0825;
    const total = subtotal + tax;
    
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
}

/* ============================================
   Payment Processing
   ============================================ */
function initPaymentProcessing() {
    // Tip buttons
    const tipBtns = document.querySelectorAll('.tip-btn');
    tipBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tipBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tipValue = this.getAttribute('data-tip');
            const customTipDiv = document.getElementById('custom-tip-input');
            
            if (tipValue === 'custom' && customTipDiv) {
                customTipDiv.style.display = 'block';
            } else if (customTipDiv) {
                customTipDiv.style.display = 'none';
            }
        });
    });
    
    // Payment method toggle
    const methodRadios = document.querySelectorAll('input[name="payment-method"]');
    const cardForm = document.getElementById('card-form');
    
    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (cardForm) {
                cardForm.style.display = this.value === 'credit' ? 'block' : 'none';
            }
        });
    });
    
    // Process payment button
    const btnPay = document.getElementById('btn-pay');
    if (btnPay) {
        btnPay.addEventListener('click', function() {
            alert('Payment processing... (Demo Mode)\n\nThank you for your order at Ramen Jin!\nOwner: Brian Chen\nWilcrest Street, Houston, TX');
        });
    }
    
    // Card number formatting
    const cardNumber = document.getElementById('card-number');
    if (cardNumber) {
        cardNumber.addEventListener('input', function() {
            let value = this.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
            let formatted = value.match(/.{1,4}/g);
            this.value = formatted ? formatted.join(' ') : '';
        });
    }
    
    // Expiry date formatting
    const cardExpiry = document.getElementById('card-expiry');
    if (cardExpiry) {
        cardExpiry.addEventListener('input', function() {
            let value = this.value.replace(/\//g, '').replace(/[^0-9]/g, '');
            if (value.length >= 2) {
                this.value = value.substring(0, 2) + '/' + value.substring(2);
            }
        });
    }
}

/* ============================================
   Receipt Management
   ============================================ */
function initReceiptManagement() {
    // View receipt buttons
    const viewBtns = document.querySelectorAll('.btn-view');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const receiptPreview = document.getElementById('receipt-preview');
            if (receiptPreview) {
                receiptPreview.style.display = 'block';
                receiptPreview.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Close receipt preview
    const btnClose = document.getElementById('btn-close-receipt');
    if (btnClose) {
        btnClose.addEventListener('click', function() {
            const receiptPreview = document.getElementById('receipt-preview');
            if (receiptPreview) {
                receiptPreview.style.display = 'none';
            }
        });
    }
    
    // Print receipt
    const btnPrint = document.getElementById('btn-print-receipt');
    if (btnPrint) {
        btnPrint.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Email receipt
    const btnEmail = document.getElementById('btn-email-receipt');
    if (btnEmail) {
        btnEmail.addEventListener('click', function() {
            alert('Receipt email sent! (Demo Mode)\n\nRamen Jin - Wilcrest Street, Houston, TX');
        });
    }
    
    // Search receipts
    const btnSearch = document.getElementById('btn-search-receipts');
    if (btnSearch) {
        btnSearch.addEventListener('click', function() {
            const searchVal = document.getElementById('receipt-search');
            if (searchVal && searchVal.value) {
                alert('Searching for: ' + searchVal.value + '\n(Demo Mode)');
            }
        });
    }
}

/* ============================================
   Sales Dashboard
   ============================================ */
function initSalesDashboard() {
    const btnFilter = document.getElementById('btn-filter');
    if (btnFilter) {
        btnFilter.addEventListener('click', function() {
            // Demo: Update metrics with sample data
            updateMetrics();
            alert('Sales data filtered! (Demo Mode)\n\nRamen Jin Sales Dashboard\nOwner: Brian Chen');
        });
    }
    
    // Load initial demo data if on sales page
    if (document.getElementById('sales-tracking')) {
        loadDemoSalesData();
    }
}

function loadDemoSalesData() {
    const totalRevenue = document.getElementById('total-revenue');
    const totalOrders = document.getElementById('total-orders');
    const avgOrder = document.getElementById('avg-order');
    const topItem = document.getElementById('top-item');
    
    if (totalRevenue) totalRevenue.textContent = '$2,847.50';
    if (totalOrders) totalOrders.textContent = '156';
    if (avgOrder) avgOrder.textContent = '$18.25';
    if (topItem) topItem.textContent = 'Tonkotsu Ramen';
    
    // Restaurant breakdown
    const rgRevenue = document.getElementById('rg-revenue');
    const rgOrders = document.getElementById('rg-orders');
    const rgAvg = document.getElementById('rg-avg');
    const bmRevenue = document.getElementById('bm-revenue');
    const bmOrders = document.getElementById('bm-orders');
    const bmAvg = document.getElementById('bm-avg');
    
    if (rgRevenue) rgRevenue.textContent = '$1,823.75';
    if (rgOrders) rgOrders.textContent = '98';
    if (rgAvg) rgAvg.textContent = '$18.61';
    if (bmRevenue) bmRevenue.textContent = '$1,023.75';
    if (bmOrders) bmOrders.textContent = '58';
    if (bmAvg) bmAvg.textContent = '$17.65';
}

function updateMetrics() {
    loadDemoSalesData();
}

/* ============================================
   Utility Functions
   ============================================ */
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}


// ===== Delivery Address Section Toggle =====
(function() {
    const pickupBtn = document.getElementById('btn-pickup');
    const deliveryBtn = document.getElementById('btn-delivery');
    const addressSection = document.getElementById('delivery-address-section');

    if (pickupBtn && addressSection) {
        pickupBtn.addEventListener('click', function() {
            addressSection.classList.remove('visible');
        });
    }

    if (deliveryBtn && addressSection) {
        deliveryBtn.addEventListener('click', function() {
            addressSection.classList.add('visible');
        });
    }
})();

/* ============================================
   Ramen Jin - localStorage Cart Logic
   ============================================ */

document.addEventListener("DOMContentLoaded", function() {
  var cartListEl = document.getElementById("cart-items-list");
  if (!cartListEl) return; // Not on order page

  var headingEl = document.getElementById("selected-items-heading");

  function getCart() {
    try {
      var data = localStorage.getItem("ramenJinCart");
      return data ? JSON.parse(data) : [];
    } catch(e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("ramenJinCart", JSON.stringify(cart));
  }


  function renderCart() {
    var cart = getCart();
    cartListEl.innerHTML = "";

    if (cart.length === 0) {
      if (headingEl) headingEl.style.display = "none";
      cartListEl.innerHTML = '<div class="empty-cart-message">Your cart is empty. Browse our menu to add items!</div>';
      updateOrderSummary([]);
      return;
    }

    if (headingEl) headingEl.style.display = "";

    cart.forEach(function(item, index) {
      var lineTotal = (item.price * item.qty).toFixed(2);
      var div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML =
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          '<div class="cart-item-price">$' + parseFloat(item.price).toFixed(2) + ' each</div>' +
        '</div>' +
        '<div class="cart-item-qty">' +
          '<button class="qty-btn" data-index="' + index + '" data-delta="-1">-</button>' +
          '<input class="qty-input" type="text" value="' + item.qty + '" readonly>' +
          '<button class="qty-btn" data-index="' + index + '" data-delta="1">+</button>' +
        '</div>' +
        '<div class="cart-item-total">$' + lineTotal + '</div>' +
        '<button class="cart-item-remove" data-index="' + index + '" title="Remove">&times;</button>';
      cartListEl.appendChild(div);
    });

    // Attach event listeners
    cartListEl.querySelectorAll(".qty-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(this.getAttribute("data-index"));
        var delta = parseInt(this.getAttribute("data-delta"));
        changeCartQty(idx, delta);
      });
    });

    cartListEl.querySelectorAll(".cart-item-remove").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(this.getAttribute("data-index"));
        removeCartItem(idx);
      });
    });

    updateOrderSummary(cart);
  }


  function updateOrderSummary(cart) {
    if (!cart) { cart = JSON.parse(localStorage.getItem("ramenJinCart") || "[]"); }
    var summaryItemsEl = document.getElementById("summary-items");
    var subtotalEl = document.getElementById("subtotal");
    var taxEl = document.getElementById("tax");
    var totalEl = document.getElementById("total");

    var subtotal = 0;
    var itemLines = [];

    cart.forEach(function(item) {
      var lineTotal = item.price * item.qty;
      subtotal += lineTotal;
      itemLines.push(item.name + " x" + item.qty + " = $" + lineTotal.toFixed(2));
    });

    if (summaryItemsEl) {
      summaryItemsEl.innerHTML = itemLines.length > 0 ? itemLines.join("<br>") : "No items selected";
    }

    var tax = subtotal * 0.08;
    var total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = "$" + subtotal.toFixed(2);
    if (taxEl) taxEl.textContent = "$" + tax.toFixed(2);
    if (totalEl) totalEl.textContent = "$" + total.toFixed(2);
  }

  function changeCartQty(index, delta) {
    var cart = getCart();
    if (index < 0 || index >= cart.length) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
    renderCart();
  }

  function removeCartItem(index) {
    var cart = getCart();
    if (index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }

  function clearCart() {
    localStorage.removeItem("ramenJinCart");
    renderCart();
  }

  // Make clearCart available globally
  window.clearRamenJinCart = clearCart;

  // Initial render
  renderCart();

  // Listen for storage changes (e.g., from menu page)
  window.addEventListener("storage", function(e) {
    if (e.key === "ramenJinCart") {
      renderCart();
    }
  });

});
