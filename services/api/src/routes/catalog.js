'use strict';
const express = require('express');
const { db, id, now, audit } = require('../utils/store');
const { authenticate, requireRoles, optionalAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const catalogRouter = express.Router();

catalogRouter.get('/categories', (_req, res) => {
  res.json({ data: db.categories, total: db.categories.length });
});

catalogRouter.get('/products', optionalAuth, (req, res) => {
  let list = db.products.filter(p => p.status === 'active' || req.user?.role === 'admin' || req.user?.role === 'seller');
  const q = (req.query.q || '').toLowerCase();
  if (q) list = list.filter(p => p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  if (req.query.categoryId) list = list.filter(p => p.categoryId === req.query.categoryId);
  if (req.query.sellerId) list = list.filter(p => p.sellerId === req.query.sellerId);
  if (req.query.minPrice) list = list.filter(p => p.price >= Number(req.query.minPrice));
  if (req.query.maxPrice) list = list.filter(p => p.price <= Number(req.query.maxPrice));
  const sort = req.query.sort || 'newest';
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ data: list, total: list.length });
});

catalogRouter.get('/products/:id', (req, res, next) => {
  const p = db.products.find(x => x.id === req.params.id || x.slug === req.params.id);
  if (!p) return next(createError(404, 'Product not found', 'NOT_FOUND'));
  const seller = db.sellers.find(s => s.id === p.sellerId);
  res.json({ ...p, seller: seller ? { id: seller.id, shopName: seller.shopName } : null });
});

catalogRouter.post('/products', authenticate, requireRoles('seller', 'admin'), (req, res, next) => {
  try {
    const { title, description, price, compareAt, stock, categoryId } = req.body || {};
    if (!title || price == null) throw createError(400, 'title and price required', 'VALIDATION');
    let sellerId = req.body.sellerId;
    if (req.user.role === 'seller') {
      const s = db.sellers.find(x => x.userId === req.user.sub);
      if (!s) throw createError(400, 'Seller profile missing', 'NO_SELLER');
      if (s.status !== 'approved' && req.user.role !== 'admin') throw createError(403, 'Seller not approved', 'SELLER_PENDING');
      sellerId = s.id;
    }
    if (!sellerId) throw createError(400, 'sellerId required', 'VALIDATION');
    const product = {
      id: id(),
      sellerId,
      categoryId: categoryId || null,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id().slice(0, 6),
      description: description || '',
      price: Number(price),
      compareAt: compareAt != null ? Number(compareAt) : null,
      stock: Number(stock) || 0,
      status: 'active',
      createdAt: now()
    };
    db.products.push(product);
    audit(req.user.sub, 'create', 'product', product.id);
    res.status(201).json(product);
  } catch (e) { next(e); }
});

catalogRouter.patch('/products/:id', authenticate, requireRoles('seller', 'admin'), (req, res, next) => {
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return next(createError(404, 'Product not found', 'NOT_FOUND'));
  if (req.user.role === 'seller') {
    const s = db.sellers.find(x => x.userId === req.user.sub);
    if (!s || s.id !== p.sellerId) return next(createError(403, 'Not your product', 'FORBIDDEN'));
  }
  ['title', 'description', 'price', 'compareAt', 'stock', 'status', 'categoryId'].forEach(f => {
    if (req.body[f] !== undefined) p[f] = req.body[f];
  });
  p.updatedAt = now();
  audit(req.user.sub, 'update', 'product', p.id);
  res.json(p);
});

module.exports = { catalogRouter };
