'use strict';
const express = require('express');
const { db, id, now, audit } = require('../utils/store');
const { authenticate, requireRoles } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const ordersRouter = express.Router();
ordersRouter.use(authenticate);

function applyCoupon(code, subtotal) {
  if (!code) return { discount: 0, coupon: null };
  const c = db.coupons.find(x => x.code.toUpperCase() === String(code).toUpperCase() && x.active);
  if (!c) return { discount: 0, coupon: null };
  if (c.minOrder && subtotal < c.minOrder) return { discount: 0, coupon: null };
  const discount = c.type === 'percent' ? Math.round(subtotal * (c.value / 100)) : Math.min(c.value, subtotal);
  return { discount, coupon: c.code };
}

ordersRouter.post('/', requireRoles('buyer', 'admin'), (req, res, next) => {
  try {
    const cart = db.carts[req.user.sub];
    if (!cart || !cart.items.length) throw createError(400, 'Cart is empty', 'EMPTY_CART');
    const lines = [];
    for (const item of cart.items) {
      const product = db.products.find(p => p.id === item.productId && p.status === 'active');
      if (!product) throw createError(400, 'Product unavailable', 'PRODUCT');
      if (product.stock < item.quantity) throw createError(400, 'Insufficient stock: ' + product.title, 'STOCK');
      lines.push({
        productId: product.id,
        sellerId: product.sellerId,
        title: product.title,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity
      });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const { discount, coupon } = applyCoupon(req.body && req.body.coupon, subtotal);
    const shipping = subtotal >= 999 ? 0 : 49;
    const total = Math.max(0, subtotal - discount + shipping);

    for (const line of lines) {
      const product = db.products.find(p => p.id === line.productId);
      product.stock -= line.quantity;
    }

    const order = {
      id: id(),
      number: 'MH-' + String(10000 + db.orders.length + 1),
      buyerId: req.user.sub,
      lines,
      subtotal,
      discount,
      coupon,
      shipping,
      total,
      status: 'placed',
      paymentStatus: 'paid',
      shippingAddress: (req.body && req.body.address) || null,
      createdAt: now()
    };
    db.orders.push(order);
    db.carts[req.user.sub] = { items: [] };
    audit(req.user.sub, 'create', 'order', order.id, { total });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

ordersRouter.get('/', (req, res) => {
  let list = [...db.orders];
  if (req.user.role === 'buyer') list = list.filter(o => o.buyerId === req.user.sub);
  if (req.user.role === 'seller') {
    const seller = db.sellers.find(s => s.userId === req.user.sub);
    list = seller ? list.filter(o => o.lines.some(l => l.sellerId === seller.id)) : [];
  }
  if (req.query.status) list = list.filter(o => o.status === req.query.status);
  list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ data: list, total: list.length });
});

ordersRouter.get('/:id', (req, res, next) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return next(createError(404, 'Order not found', 'NOT_FOUND'));
  if (req.user.role === 'buyer' && order.buyerId !== req.user.sub) {
    return next(createError(403, 'Forbidden', 'FORBIDDEN'));
  }
  res.json(order);
});

ordersRouter.patch('/:id/status', requireRoles('seller', 'admin'), (req, res, next) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return next(createError(404, 'Order not found', 'NOT_FOUND'));
  const allowed = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(req.body.status)) return next(createError(400, 'Invalid status', 'VALIDATION'));
  order.status = req.body.status;
  order.updatedAt = now();
  audit(req.user.sub, 'status_change', 'order', order.id, { status: order.status });
  res.json(order);
});

module.exports = { ordersRouter };
