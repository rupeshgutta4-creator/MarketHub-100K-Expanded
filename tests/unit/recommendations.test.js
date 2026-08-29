'use strict';
const { MarketPulseRec } = require('../../services/api/src/utils/recommendationCapsules');

describe('MarketPulseRec Multi-Interest Recommendation Capsules', () => {
  let pulseRec;

  beforeEach(() => {
    pulseRec = new MarketPulseRec();
  });

  test('generates category affinity capsules for active buyer', () => {
    const result = pulseRec.generateBuyerCapsules({
      id: 'BUYER-201',
      recentCategories: ['Electronics', 'Home Goods']
    });

    expect(result.capsuleCount).toBe(1);
    expect(result.capsules[0].interest).toBe('category_affinity');
    expect(result.capsules[0].priority).toBe('HIGH');
  });

  test('returns zero capsules for cold-start buyers with no activity', () => {
    const result = pulseRec.generateBuyerCapsules({
      id: 'BUYER-NEW',
      recentCategories: []
    });

    expect(result.capsuleCount).toBe(0);
  });
});
