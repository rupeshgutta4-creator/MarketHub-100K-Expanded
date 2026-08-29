'use strict';

class VortexFeatureStore {
  constructor() {
    this.records = new Map();
  }

  registerFeature(name, value, timestamp = new Date().toISOString(), metadata = {}) {
    if (!name) throw new Error('Feature name is required');
    const isoTime = new Date(timestamp).toISOString();
    const entry = {
      id: `${name}-${new Date(isoTime).getTime()}`,
      name: name.trim(),
      value,
      timestamp: isoTime,
      metadata: { ...metadata }
    };
    this.records.set(entry.id, entry);
    return entry;
  }

  getTimeline(name) {
    if (!name) return [];
    return Array.from(this.records.values())
      .filter(r => r.name === name.trim())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  asOfJoin(targetTimestamp, featureNames = [], options = {}) {
    const targetMs = new Date(targetTimestamp).getTime();
    if (Number.isNaN(targetMs)) throw new Error('Invalid target timestamp');

    const requested = Array.isArray(featureNames) && featureNames.length
      ? featureNames.map(f => f.trim())
      : Array.from(new Set(Array.from(this.records.values()).map(r => r.name)));

    const result = {
      asOf: new Date(targetMs).toISOString(),
      features: {},
      missing: []
    };

    for (const name of requested) {
      const timeline = this.getTimeline(name);
      let match = null;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (new Date(timeline[i].timestamp).getTime() <= targetMs) {
          match = timeline[i];
          break;
        }
      }

      if (match) {
        result.features[name] = {
          value: match.value,
          effectiveTimestamp: match.timestamp
        };
      } else {
        result.missing.push(name);
        if (options.defaults && options.defaults[name] !== undefined) {
          result.features[name] = {
            value: options.defaults[name],
            fallback: true
          };
        }
      }
    }

    return result;
  }
}

const defaultFeatureStore = new VortexFeatureStore();
module.exports = { VortexFeatureStore, defaultFeatureStore };
