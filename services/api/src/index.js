'use strict';

const express = require('express');
const cors = require('cors');
const { authRouter } = require('./routes/auth');
const { catalogRouter } = require('./routes/catalog');
const { cartRouter } = require('./routes/cart');
const { ordersRouter } = require('./routes/orders');
const { sellersRouter } = require('./routes/sellers');
const { adminRouter } = require('./routes/admin');
const { reviewsRouter } = require('./routes/reviews');
const { errorHandler } = require('./middleware/errorHandler');
const { seedDemoData } = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'markethub-api', version: '1.0.0', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviews', reviewsRouter);

app.use(errorHandler);
seedDemoData();

app.listen(PORT, () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg: 'MarketHub API listening', port: PORT }));
});
