'use strict';

const ROLES = ['admin', 'seller', 'buyer'];
const ORDER_STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const SELLER_STATUSES = ['pending', 'approved', 'suspended'];

function isRole(role) {
  return ROLES.includes(role);
}

function calcLineTotal(unitPrice, quantity) {
  return (Number(unitPrice) || 0) * (Number(quantity) || 0);
}

function calcOrderTotals(lines, discount = 0, shipping = 0) {
  const subtotal = (lines || []).reduce((s, l) => s + calcLineTotal(l.unitPrice ?? l.price, l.quantity), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(shipping) || 0));
  return { subtotal, discount: Number(discount) || 0, shipping: Number(shipping) || 0, total };
}

module.exports = { ROLES, ORDER_STATUSES, SELLER_STATUSES, isRole, calcLineTotal, calcOrderTotals };
