'use strict';
const { PsiGovernance } = require('../../services/api/src/utils/psiGovernance');

describe('MarketHub MLOps Streaming PSI Governance', () => {
  let gov;

  beforeEach(() => {
    gov = new PsiGovernance();
  });

  test('reports zero drift for identical catalog demand distributions', () => {
    const base = [100, 200, 300, 400];
    const target = [100, 200, 300, 400];
    const res = gov.calculatePSI(base, target);

    expect(res.psi).toBe(0);
    expect(res.driftLevel).toBe('NONE');
    expect(res.requiresAction).toBe(false);
  });

  test('flags significant drift when catalog distribution shifts', () => {
    const base = [400, 300, 200, 100];
    const target = [50, 100, 300, 550];
    const res = gov.calculatePSI(base, target);

    expect(res.psi).toBeGreaterThanOrEqual(0.20);
    expect(res.driftLevel).toBe('SIGNIFICANT');
    expect(res.requiresAction).toBe(true);
  });
});
