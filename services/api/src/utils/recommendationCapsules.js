'use strict';

class MarketPulseRec {
  generateBuyerCapsules(buyerProfile = {}) {
    const capsules = [];

    // Category affinity capsule
    if (buyerProfile.recentCategories && buyerProfile.recentCategories.length) {
      capsules.push({
        interest: 'category_affinity',
        priority: 'HIGH',
        categories: buyerProfile.recentCategories,
        recommendations: buyerProfile.recentCategories.map(c => `Trending items in ${c}`)
      });
    }

    // High cart abandonment or price drop capsule
    if (buyerProfile.hasAbandonedCart) {
      capsules.push({
        interest: 'cart_recovery',
        priority: 'MEDIUM',
        recommendations: ['Special 10% coupon available for items in your cart']
      });
    }

    return {
      buyerId: buyerProfile.id || 'N/A',
      capsuleCount: capsules.length,
      capsules
    };
  }
}

module.exports = { MarketPulseRec };
