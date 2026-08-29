'use strict';

class PsiGovernance {
  calculatePSI(baseline = [], target = [], epsilon = 1e-4) {
    if (!baseline.length || baseline.length !== target.length) {
      throw new Error('Distributions must be non-empty arrays of identical length');
    }

    const sumBase = baseline.reduce((a, b) => a + Number(b || 0), 0);
    const sumTarget = target.reduce((a, b) => a + Number(b || 0), 0);

    if (sumBase === 0 || sumTarget === 0) {
      throw new Error('Total distribution count cannot be zero');
    }

    let psi = 0;
    for (let i = 0; i < baseline.length; i++) {
      const bPct = Math.max(epsilon, Number(baseline[i] || 0) / sumBase);
      const tPct = Math.max(epsilon, Number(target[i] || 0) / sumTarget);
      psi += (tPct - bPct) * Math.log(tPct / bPct);
    }

    const rounded = Number(Math.max(0, psi).toFixed(4));
    return {
      psi: rounded,
      driftLevel: rounded >= 0.20 ? 'SIGNIFICANT' : rounded >= 0.10 ? 'MODERATE' : 'NONE',
      requiresAction: rounded >= 0.10
    };
  }
}

module.exports = { PsiGovernance };
