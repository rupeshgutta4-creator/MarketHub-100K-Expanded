'use strict';
const { calcLineTotal, calcOrderTotals, ORDER_STATUSES, isRole } = require('../../packages/shared/src/index.js');

describe('MarketHub order helpers', () => {
  test('line total', () => {
    expect(calcLineTotal(100, 3)).toBe(300);
    expect(calcLineTotal('50', 2)).toBe(100);
  });

  test('order totals with discount and shipping', () => {
    const t = calcOrderTotals(
      [{ unitPrice: 500, quantity: 2 }, { price: 100, quantity: 1 }],
      50,
      49
    );
    expect(t.subtotal).toBe(1100);
    expect(t.discount).toBe(50);
    expect(t.shipping).toBe(49);
    expect(t.total).toBe(1099);
  });

  test('roles and statuses', () => {
    expect(isRole('seller')).toBe(true);
    expect(isRole('hacker')).toBe(false);
    expect(ORDER_STATUSES).toContain('shipped');
  });
});
