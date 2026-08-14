'use strict';
const express = require('express');
const { db } = require('../utils/store');
const { authenticate, requireRoles } = require('../middleware/auth');

const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(requireRoles('admin'));

adminRouter.get('/dashboard', (_req, res) => {
  const paidOrders = db.orders.filter(o => o.paymentStatus === 'paid');
  res.json({
    users: db.users.length,
    sellers: db.sellers.length,
    products: db.products.length,
    orders: db.orders.length,
    gmv: paidOrders.reduce((s, o) => s + (o.total || 0), 0),
    pendingSellers: db.sellers.filter(s => s.status === 'pending').length,
    activeProducts: db.products.filter(p => p.status === 'active').length
  });
});

adminRouter.get('/audit', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({ data: db.audit.slice(-limit).reverse(), total: db.audit.length });
});

module.exports = { adminRouter };
