'use strict';

class AegisSecurityGraph {
  constructor() {
    this.edges = new Map();
  }

  addAccessEdge(subjectId, objectId) {
    if (!this.edges.has(subjectId)) {
      this.edges.set(subjectId, new Set());
    }
    this.edges.get(subjectId).add(objectId);
  }

  detectRingCycles(startNode, maxDepth = 6) {
    const visited = new Set();
    const stack = [];
    const cycles = [];

    const dfs = (curr, origin, depth) => {
      if (depth > maxDepth) return;
      visited.add(curr);
      stack.push(curr);

      const neighbors = this.edges.get(curr) || new Set();
      for (const next of neighbors) {
        if (next === origin && stack.length >= 3) {
          cycles.push([...stack, next]);
        } else if (!visited.has(next)) {
          dfs(next, origin, depth + 1);
        }
      }

      stack.pop();
      visited.delete(curr);
    };

    dfs(startNode, startNode, 0);
    return {
      node: startNode,
      hasRingAnomaly: cycles.length > 0,
      cycles
    };
  }
}

module.exports = { AegisSecurityGraph };
