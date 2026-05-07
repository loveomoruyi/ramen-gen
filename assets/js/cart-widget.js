/* ============================================
   Ramen Jin - Floating Cart Widget
   Animated floating button & pop-up panel
   ============================================ */

(function() {
  'use strict';

  function getCart() {
    return JSON.parse(localStorage.getItem('ramenJinCart') || '[]');
  }

  function saveCart(cart) {
    localStorage.setItem('ramenJinCart', JSON.stringify(cart));
  }

  function getCartTotal() {
    var cart = getCart();
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].price * cart[i].qty;
    }
    return total;
  }

  function getCartCount() {
    var cart = getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
      count += cart[i].qty;
    }
    return count;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function createWidgetHTML() {
    var container = document.createElement('div');
    container.id = 'cart-widget-container';

    var btn = document.createElement('button');
    btn.id = 'cart-widget-btn';
    btn.setAttribute('aria-label', 'View Cart');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

    var badge = document.createElement('span');
    badge.id = 'cart-widget-badge';
    badge.className = 'hidden';
    badge.textContent = '0';
    btn.appendChild(badge);
    container.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'cart-widget-panel';
    panel.className = 'cart-widget-panel-hidden';

    var header = document.createElement('div');
    header.className = 'cart-widget-header';
    header.innerHTML = '<h3 class="cart-widget-title">\ud83c\udf5c Your Order</h3><button id="cart-widget-close" class="cart-widget-close-btn" aria-label="Close">&times;</button>';
    panel.appendChild(header);

    var itemsList = document.createElement('div');
    itemsList.id = 'cart-widget-items';
    itemsList.className = 'cart-widget-items';
    panel.appendChild(itemsList);

    var footer = document.createElement('div');
    footer.className = 'cart-widget-footer';

    var totalRow = document.createElement('div');
    totalRow.className = 'cart-widget-total';
    totalRow.innerHTML = '<span>Subtotal:</span><span id="cart-widget-subtotal">$0.00</span>';
    footer.appendChild(totalRow);

    var actions = document.createElement('div');
    actions.className = 'cart-widget-actions';

    var viewBtn = document.createElement('a');
    viewBtn.id = 'cart-widget-view-btn';
    viewBtn.href = 'order.html';
    viewBtn.className = 'cart-widget-action-btn cart-widget-view';
    viewBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View Selected Items';

    var checkoutBtn = document.createElement('a');
    checkoutBtn.id = 'cart-widget-checkout-btn';
    checkoutBtn.href = 'payment.html';
    checkoutBtn.className = 'cart-widget-action-btn cart-widget-checkout';
    checkoutBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Go to Cart / Checkout';

    actions.appendChild(viewBtn);
    actions.appendChild(checkoutBtn);
    footer.appendChild(actions);
    panel.appendChild(footer);

    var emptyState = document.createElement('div');
    emptyState.id = 'cart-widget-empty';
    emptyState.className = 'cart-widget-empty';
    emptyState.innerHTML = '<p>Your cart is empty</p><p style="font-size:12px;color:#888;">Add some delicious ramen!</p>';
    panel.appendChild(emptyState);

    container.appendChild(panel);

    var toast = document.createElement('div');
    toast.id = 'cart-widget-toast';
    toast.className = 'cart-widget-toast';
    container.appendChild(toast);

    return container;
  }

  function renderWidgetItems() {
    var cart = getCart();
    var itemsEl = document.getElementById('cart-widget-items');
    var emptyEl = document.getElementById('cart-widget-empty');
    var subtotalEl = document.getElementById('cart-widget-subtotal');
    var footerActions = document.querySelector('.cart-widget-actions');
    var totalRow = document.querySelector('.cart-widget-total');

    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footerActions) footerActions.style.display = 'none';
      if (totalRow) totalRow.style.display = 'none';
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      return;
    }

    itemsEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (footerActions) footerActions.style.display = 'flex';
    if (totalRow) totalRow.style.display = 'flex';

    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      html += '<div class="cart-widget-item" data-index="' + i + '">' +
        '<div class="cart-widget-item-info">' +
          '<div class="cart-widget-item-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="cart-widget-item-details">' +
            '<span class="cart-widget-item-qty">Qty: ' + item.qty + '</span> &middot; ' +
            '<span class="cart-widget-item-price">$' + (item.price * item.qty).toFixed(2) + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="cart-widget-remove-btn" data-index="' + i + '" aria-label="Remove">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>';
    }
    itemsEl.innerHTML = html;

    if (subtotalEl) {
      subtotalEl.textContent = '$' + getCartTotal().toFixed(2);
    }

    var removeBtns = itemsEl.querySelectorAll('.cart-widget-remove-btn');
    for (var j = 0; j < removeBtns.length; j++) {
      removeBtns[j].addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-index'));
        removeWidgetItem(idx);
      });
    }
  }

  function removeWidgetItem(index) {
    var cart = getCart();
    if (index >= 0 && index < cart.length) {
      cart.splice(index, 1);
      saveCart(cart);
      renderWidgetItems();
      updateBadge();
      if (typeof window.renderCart === 'function') {
        window.renderCart();
      }
    }
  }

  function updateBadge() {
    var badge = document.getElementById('cart-widget-badge');
    var btn = document.getElementById('cart-widget-btn');
    if (!badge) return;

    var count = getCartCount();
    badge.textContent = count;

    if (count > 0) {
      badge.classList.remove('hidden');
        // btn always visible (sticky)
    } else {
      badge.classList.add('hidden');
    }
  }

  var panelOpen = false;

  function togglePanel() {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    var panel = document.getElementById('cart-widget-panel');
    if (!panel) return;
    renderWidgetItems();
        panel.style.display = 'flex';
    panel.classList.remove('cart-widget-panel-hidden');
    panel.classList.add('cart-widget-panel-visible');
        panel.classList.add('open');
    panelOpen = true;
  }

  function closePanel() {
    var panel = document.getElementById('cart-widget-panel');
    if (!panel) return;
    panel.classList.remove('cart-widget-panel-visible');
    panel.classList.add('cart-widget-panel-hidden');
        panel.classList.remove('open');
    panelOpen = false;
        panel.style.display = 'none';
  }

  /* Apple-style Genie fly animation */
    function genieAnimateToCart(itemName, qty, sourceEl) {
        var startRect;
        if (sourceEl) {
            startRect = sourceEl.getBoundingClientRect();
        } else {
            startRect = {left: window.innerWidth/2-60, top: window.innerHeight/2, width: 120, height: 40};
        }
        var navCartLink = document.getElementById('nav-cart-link');
        var cartBtn = document.getElementById('cart-widget-btn');
        var endRect;
        if (navCartLink) { endRect = navCartLink.getBoundingClientRect(); }
        else if (cartBtn) { endRect = cartBtn.getBoundingClientRect(); }
        else { endRect = {left: window.innerWidth-60, top: 15, width: 40, height: 40}; }

        var clone = document.createElement('div');
        clone.className = 'genie-fly-clone';
        clone.innerHTML = '<span class="genie-icon">\u{1F35C}</span> ' + escapeHtml(itemName) + ' x' + qty;
        clone.style.left = startRect.left + 'px';
        clone.style.top = (startRect.top + startRect.height/2 - 18) + 'px';
        clone.style.transformOrigin = 'center center';
        document.body.appendChild(clone);

        var cloneRect = clone.getBoundingClientRect();
        var dx = (endRect.left + endRect.width/2) - (cloneRect.left + cloneRect.width/2);
        var dy = (endRect.top + endRect.height/2) - (cloneRect.top + cloneRect.height/2);
        clone.offsetHeight; /* force reflow */

        clone.style.transition = 'all 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)';
        clone.style.transform = 'translate('+dx+'px,'+dy+'px) scale(0.1) perspective(800px) rotateX(20deg)';
        clone.style.opacity = '0';
        clone.style.borderRadius = '50px';
        clone.style.width = '20px';
        clone.style.height = '20px';
        clone.style.padding = '2px';
        clone.style.fontSize = '6px';
        clone.style.overflow = 'hidden';

        setTimeout(function() {
            if (navCartLink) {
                navCartLink.classList.add('cart-bounce');
                setTimeout(function(){navCartLink.classList.remove('cart-bounce');}, 600);
            }
            if (cartBtn) {
                cartBtn.classList.add('cart-receive-bounce');
                setTimeout(function(){cartBtn.classList.remove('cart-receive-bounce');}, 600);
            }
            var navBadge = document.getElementById('nav-cart-badge');
            if (navBadge) {
                navBadge.classList.add('pulse-badge');
                setTimeout(function(){navBadge.classList.remove('pulse-badge');}, 500);
            }
        }, 550);

        setTimeout(function() {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
        }, 800);
    }

    function showWidgetToast(itemName, qty) {
    var toast = document.getElementById('cart-widget-toast');
    if (!toast) return;

    toast.innerHTML = '<div class="cart-widget-toast-icon">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</div>' +
      '<div class="cart-widget-toast-text">' +
        '<strong>' + escapeHtml(itemName) + '</strong>' +
        '<span> (x' + qty + ') added!</span>' +
      '</div>';

    // Position toast just below the cart panel
    var panel = document.getElementById('cart-widget-panel');
    if (panel && panel.classList.contains('open')) {
        var panelRect = panel.getBoundingClientRect();
        toast.style.top = (panelRect.bottom + 6) + 'px';
    } else {
        var btn = document.getElementById('cart-widget-btn');
        if (btn) {
            var btnRect = btn.getBoundingClientRect();
            toast.style.top = (btnRect.bottom + 6) + 'px';
        }
    }

    toast.classList.add('cart-widget-toast-show');

    var btn = document.getElementById('cart-widget-btn');
    if (btn) {
      btn.classList.add('pulse');
      setTimeout(function() { btn.classList.remove('pulse'); }, 600);
    }

    setTimeout(function() {
      openPanel();
    }, 400);

    setTimeout(function() {
      toast.classList.remove('cart-widget-toast-show');
    }, 3000);
  }

  function initCartWidget() {
    var path = window.location.pathname;
    // Only show cart widget on Menu and Order Online pages (not on Cart/Payment or other pages)
    if (path.indexOf('menu') === -1 && path.indexOf('order') === -1) return;

    var widget = createWidgetHTML();
    document.documentElement.appendChild(widget);

    var btn = document.getElementById('cart-widget-btn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      });
    }

    var closeBtn = document.getElementById('cart-widget-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closePanel();
      });
    }

    document.addEventListener('click', function(e) {
      var panel = document.getElementById('cart-widget-panel');
      var btn = document.getElementById('cart-widget-btn');
      if (panelOpen && panel && btn) {
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
          closePanel();
        }
      }
    });

    updateBadge();

    // Always show cart button (sticky/floating)
    if (btn) btn.style.display = 'flex';
    if (btn) btn.style.left = 'auto';
    if (btn) btn.style.width = '55px';
    if (btn) btn.style.height = '55px';

  }

  window.CartWidget = {
    update: function() {
      updateBadge();
      renderWidgetItems();
    },
    show: function(itemName, qty) {
      updateBadge();
      showWidgetToast(itemName, qty);
    },
    openPanel: openPanel,
    closePanel: closePanel,
    toggle: togglePanel
  };


    // Track which Add to Order button was clicked for Genie animation
    document.addEventListener("click", function(e) {
        var btn = e.target.closest(".btn-add-to-order");
        if (btn) { window._lastAddToCartBtn = btn; }
    }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartWidget);
  } else {
    initCartWidget();
  }

})();


// Inject cart SVG icon into nav cart link and add click handler
(function() {
    var navLink = document.getElementById('nav-cart-link');
    if (navLink) {
        var svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;pointer-events:none;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
        var badge = navLink.querySelector('.nav-cart-badge');
        navLink.innerHTML = svgIcon + ' Cart ';
        if (badge) navLink.appendChild(badge);
        // Add proper click event listener
        navLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof CartWidget !== 'undefined' && CartWidget.toggle) {
                CartWidget.toggle();
            }
        });
        // Remove inline onclick to avoid double-firing
        navLink.removeAttribute('onclick');
    }
})();
