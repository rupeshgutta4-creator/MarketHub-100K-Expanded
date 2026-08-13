'use strict';
const express = require('express');
const { db, id, now, audit } = require('../utils/store');
const { authenticate, requireRoles } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const reviewsRouter = express.Router();

reviewsRouter.get('/', (req, res) => {
  let list = [...db.reviews];
  if (req.query.productId) list = list.filter(r => r.productId === req.query.productId);
  res.json({ data: list, total: list.length });
});

reviewsRouter.post('/', authenticate, requireRoles('buyer', 'admin'), (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body || {};
    if (!productId || !rating) throw createError(400, 'productId and rating required', 'VALIDATION');
    const r = Math.min(5, Math.max(1, Number(rating)));
    if (!db.products.find(p => p.id === productId)) throw createError(404, 'Product not found', 'NOT_FOUND');
    const review = {
      id: id(), productId, buyerId: req.user.sub, rating: r,
      comment: comment || '', createdAt: now()
    };
    db.reviews.push(review);
    audit(req.user.sub, 'create', 'review', review.id);
    res.status(201).json(review);
  } catch (e) { next(e); }
});

module.exports = { reviewsRouter };
