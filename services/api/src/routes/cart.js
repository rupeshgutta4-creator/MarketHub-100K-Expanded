'use strict';
const express = require('express');
const { db } = require('../utils/store');
const { authenticate } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const cartRouter = express.Router();
cartRouter.use(authenticate);

function getCart(userId) {
  if (!db.carts[userId]) db.carts[userId] = { items: [] };
  return db.carts[userId];
}

cartRouter.get('/', (req, res) => {
  const cart = getCart(req.user.sub);
  const detailed = cart.items.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product ? { id: product.id, title: product.title, price: product.price, stock: product.stock } : null,
      lineTotal: product ? product.price * item.quantity : 0
    };
  });
  const subtotal = detailed.reduce((s, i) => s + i.lineTotal, 0);
  res.json({ items: detailed, subtotal, count: detailed.reduce((s, i) => s + i.quantity, 0) });
});

cartRouter.post('/items', (req, res, next) => {
  try {
    const { productId, quantity } = req.body || {};
    if (!productId) throw createError(400, 'productId required', 'VALIDATION');
    const product = db.products.find(p => p.id === productId && p.status === 'active');
    if (!product) throw createError(404, 'Product not found', 'NOT_FOUND');
    const qty = Math.max(1, Number(quantity) || 1);
    if (product.stock < qty) throw createError(400, 'Insufficient stock', 'STOCK');
    const cart = getCart(req.user.sub);
    const existing = cart.items.find(i => i.productId === productId);
    if (existing) existing.quantity = Math.min(product.stock, existing.quantity + qty);
    else cart.items.push({ productId, quantity: qty });
    res.status(201).json(cart);
  } catch (e) { next(e); }
});

cartRouter.delete('/items/:productId', (req, res) => {
  const cart = getCart(req.user.sub);
  cart.items = cart.items.filter(i => i.productId !== req.params.productId);
  res.json(cart);
});

cartRouter.delete('/', (req, res) => {
  db.carts[req.user.sub] = { items: [] };
  res.json({ items: [], subtotal: 0, count: 0 });
});

module.exports = { cartRouter };
