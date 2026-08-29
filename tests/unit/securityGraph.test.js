'use strict';
const { AegisSecurityGraph } = require('../../services/api/src/utils/securityGraph');

describe('MarketHub AegisGuard Graph Ring Analytics', () => {
  let graph;

  beforeEach(() => {
    graph = new AegisSecurityGraph();
  });

  test('detects circular transaction rings across buyers and sellers', () => {
    graph.addAccessEdge('BuyerA', 'SellerB');
    graph.addAccessEdge('SellerB', 'AccountC');
    graph.addAccessEdge('AccountC', 'BuyerA');

    const result = graph.detectRingCycles('BuyerA');
    expect(result.hasRingAnomaly).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
  });

  test('reports clean when transaction flow is acyclic DAG', () => {
    graph.addAccessEdge('BuyerA', 'SellerB');
    graph.addAccessEdge('BuyerC', 'SellerB');

    const result = graph.detectRingCycles('BuyerA');
    expect(result.hasRingAnomaly).toBe(false);
  });
});
