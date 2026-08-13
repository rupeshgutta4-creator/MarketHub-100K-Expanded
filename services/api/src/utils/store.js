'use strict';
const { v4: uuid } = require('uuid');

const db = {
  users: [],
  sellers: [],
  products: [],
  categories: [],
  carts: {},
  orders: [],
  reviews: [],
  coupons: [],
  audit: []
};

const id = () => uuid();
const now = () => new Date().toISOString();
function audit(actorId, action, entity, entityId, meta) {
  db.audit.push({ id: id(), actorId, action, entity, entityId, meta: meta || null, at: now() });
}

module.exports = { db, id, now, audit };
