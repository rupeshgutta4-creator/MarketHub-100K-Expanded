'use strict';
const express = require('express');
const { db, id, now, audit } = require('../utils/store');
const { authenticate, requireRoles } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const sellersRouter = express.Router();

sellersRouter.get('/', (_req, res) => {
  const list = db.sellers.filter(s => s.status === 'approved').map(s => ({
    id: s.id, shopName: s.shopName, slug: s.slug, status: s.status
  }));
  res.json({ data: list, total: list.length });
});

sellersRouter.get('/me', authenticate, requireRoles('seller', 'admin'), (req, res, next) => {
  const s = db.sellers.find(x => x.userId === req.user.sub);
  if (!s) return next(createError(404, 'Seller profile not found', 'NOT_FOUND'));
  const products = db.products.filter(p => p.sellerId === s.id);
  res.json({ ...s, productCount: products.length });
});

sellersRouter.patch('/:id/status', authenticate, requireRoles('admin'), (req, res, next) => {
  const s = db.sellers.find(x => x.id === req.params.id);
  if (!s) return next(createError(404, 'Seller not found', 'NOT_FOUND'));
  if (!['pending', 'approved', 'suspended'].includes(req.body.status)) {
    return next(createError(400, 'Invalid status', 'VALIDATION'));
  }
  s.status = req.body.status;
  s.updatedAt = now();
  audit(req.user.sub, 'status_change', 'seller', s.id, { status: s.status });
  res.json(s);
});

sellersRouter.get('/admin/all', authenticate, requireRoles('admin'), (_req, res) => {
  res.json({ data: db.sellers, total: db.sellers.length });
});

module.exports = { sellersRouter };
