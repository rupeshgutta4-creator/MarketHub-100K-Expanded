'use strict';
const { VortexFeatureStore } = require('../../services/api/src/utils/featureStore');

describe('MarketHub Vortex Feature Store Point-in-Time Joins', () => {
  let store;

  beforeEach(() => {
    store = new VortexFeatureStore();
  });

  test('registers and retrieves historical feature snapshots as-of timestamp', () => {
    store.registerFeature('seller_commission_rate', 0.15, '2026-01-01T00:00:00Z');
    store.registerFeature('seller_commission_rate', 0.12, '2026-04-01T00:00:00Z');

    const marchState = store.asOfJoin('2026-03-15T00:00:00Z', ['seller_commission_rate']);
    expect(marchState.features.seller_commission_rate.value).toBe(0.15);

    const mayState = store.asOfJoin('2026-05-01T00:00:00Z', ['seller_commission_rate']);
    expect(mayState.features.seller_commission_rate.value).toBe(0.12);
  });

  test('handles missing flags with fallback defaults', () => {
    const result = store.asOfJoin('2026-01-01T00:00:00Z', ['flash_sale_enabled'], {
      defaults: { flash_sale_enabled: false }
    });
    expect(result.missing).toContain('flash_sale_enabled');
    expect(result.features.flash_sale_enabled.value).toBe(false);
  });
});
