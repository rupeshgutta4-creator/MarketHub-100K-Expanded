'use strict';
// Policy engine for refunds.
const DOMAIN = 'refunds';
const FIELDS = ['id', 'paymentId', 'orderId', 'amount', 'reason', 'status', 'providerReference', 'processedAt', 'createdAt', 'updatedAt'];

function isDefined(value) { return value !== undefined && value !== null && value !== ''; }
function asText(value) { return value == null ? '' : String(value).trim(); }
function asNumber(value) { const n=Number(value); return Number.isFinite(n) ? n : null; }
function asArray(value) { return Array.isArray(value) ? value : []; }
function asObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function result(ok, field, code, message, value) { return { ok, domain: DOMAIN, field, code, message, value }; }

function requiredRule_0(value) {
  if (!isDefined(value)) return result(false, 'id', 'REQUIRED', 'id'+' is required', value);
  return result(true, 'id', 'OK', 'id'+' is present', value);
}

function trimRule_0(value) {
  if (typeof value !== 'string') return result(true, 'id', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'id', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_0(value) {
  return result(true, 'id', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_0(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'id', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'id', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'id', 'MAX', 'above maximum', n);
  return result(true, 'id', 'OK', 'within range', n);
}

function listRule_0(value) {
  const list = asArray(value);
  return result(true, 'id', 'LIST', 'list normalized', list);
}

function objectRule_0(value) {
  const object = asObject(value);
  return result(true, 'id', 'OBJECT', 'object normalized', object);
}

function requiredRule_1(value) {
  if (!isDefined(value)) return result(false, 'paymentId', 'REQUIRED', 'paymentId'+' is required', value);
  return result(true, 'paymentId', 'OK', 'paymentId'+' is present', value);
}

function trimRule_1(value) {
  if (typeof value !== 'string') return result(true, 'paymentId', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'paymentId', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_1(value) {
  return result(true, 'paymentId', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_1(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'paymentId', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'paymentId', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'paymentId', 'MAX', 'above maximum', n);
  return result(true, 'paymentId', 'OK', 'within range', n);
}

function listRule_1(value) {
  const list = asArray(value);
  return result(true, 'paymentId', 'LIST', 'list normalized', list);
}

function objectRule_1(value) {
  const object = asObject(value);
  return result(true, 'paymentId', 'OBJECT', 'object normalized', object);
}

function requiredRule_2(value) {
  if (!isDefined(value)) return result(false, 'orderId', 'REQUIRED', 'orderId'+' is required', value);
  return result(true, 'orderId', 'OK', 'orderId'+' is present', value);
}

function trimRule_2(value) {
  if (typeof value !== 'string') return result(true, 'orderId', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'orderId', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_2(value) {
  return result(true, 'orderId', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_2(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'orderId', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'orderId', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'orderId', 'MAX', 'above maximum', n);
  return result(true, 'orderId', 'OK', 'within range', n);
}

function listRule_2(value) {
  const list = asArray(value);
  return result(true, 'orderId', 'LIST', 'list normalized', list);
}

function objectRule_2(value) {
  const object = asObject(value);
  return result(true, 'orderId', 'OBJECT', 'object normalized', object);
}

function requiredRule_3(value) {
  if (!isDefined(value)) return result(false, 'amount', 'REQUIRED', 'amount'+' is required', value);
  return result(true, 'amount', 'OK', 'amount'+' is present', value);
}

function trimRule_3(value) {
  if (typeof value !== 'string') return result(true, 'amount', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'amount', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_3(value) {
  return result(true, 'amount', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_3(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'amount', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'amount', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'amount', 'MAX', 'above maximum', n);
  return result(true, 'amount', 'OK', 'within range', n);
}

function listRule_3(value) {
  const list = asArray(value);
  return result(true, 'amount', 'LIST', 'list normalized', list);
}

function objectRule_3(value) {
  const object = asObject(value);
  return result(true, 'amount', 'OBJECT', 'object normalized', object);
}

function requiredRule_4(value) {
  if (!isDefined(value)) return result(false, 'reason', 'REQUIRED', 'reason'+' is required', value);
  return result(true, 'reason', 'OK', 'reason'+' is present', value);
}

function trimRule_4(value) {
  if (typeof value !== 'string') return result(true, 'reason', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'reason', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_4(value) {
  return result(true, 'reason', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_4(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'reason', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'reason', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'reason', 'MAX', 'above maximum', n);
  return result(true, 'reason', 'OK', 'within range', n);
}

function listRule_4(value) {
  const list = asArray(value);
  return result(true, 'reason', 'LIST', 'list normalized', list);
}

function objectRule_4(value) {
  const object = asObject(value);
  return result(true, 'reason', 'OBJECT', 'object normalized', object);
}

function requiredRule_5(value) {
  if (!isDefined(value)) return result(false, 'status', 'REQUIRED', 'status'+' is required', value);
  return result(true, 'status', 'OK', 'status'+' is present', value);
}

function trimRule_5(value) {
  if (typeof value !== 'string') return result(true, 'status', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'status', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_5(value) {
  return result(true, 'status', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_5(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'status', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'status', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'status', 'MAX', 'above maximum', n);
  return result(true, 'status', 'OK', 'within range', n);
}

function listRule_5(value) {
  const list = asArray(value);
  return result(true, 'status', 'LIST', 'list normalized', list);
}

function objectRule_5(value) {
  const object = asObject(value);
  return result(true, 'status', 'OBJECT', 'object normalized', object);
}

function requiredRule_6(value) {
  if (!isDefined(value)) return result(false, 'providerReference', 'REQUIRED', 'providerReference'+' is required', value);
  return result(true, 'providerReference', 'OK', 'providerReference'+' is present', value);
}

function trimRule_6(value) {
  if (typeof value !== 'string') return result(true, 'providerReference', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'providerReference', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_6(value) {
  return result(true, 'providerReference', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_6(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'providerReference', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'providerReference', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'providerReference', 'MAX', 'above maximum', n);
  return result(true, 'providerReference', 'OK', 'within range', n);
}

function listRule_6(value) {
  const list = asArray(value);
  return result(true, 'providerReference', 'LIST', 'list normalized', list);
}

function objectRule_6(value) {
  const object = asObject(value);
  return result(true, 'providerReference', 'OBJECT', 'object normalized', object);
}

function requiredRule_7(value) {
  if (!isDefined(value)) return result(false, 'processedAt', 'REQUIRED', 'processedAt'+' is required', value);
  return result(true, 'processedAt', 'OK', 'processedAt'+' is present', value);
}

function trimRule_7(value) {
  if (typeof value !== 'string') return result(true, 'processedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'processedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_7(value) {
  return result(true, 'processedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_7(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'processedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'processedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'processedAt', 'MAX', 'above maximum', n);
  return result(true, 'processedAt', 'OK', 'within range', n);
}

function listRule_7(value) {
  const list = asArray(value);
  return result(true, 'processedAt', 'LIST', 'list normalized', list);
}

function objectRule_7(value) {
  const object = asObject(value);
  return result(true, 'processedAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_8(value) {
  if (!isDefined(value)) return result(false, 'createdAt', 'REQUIRED', 'createdAt'+' is required', value);
  return result(true, 'createdAt', 'OK', 'createdAt'+' is present', value);
}

function trimRule_8(value) {
  if (typeof value !== 'string') return result(true, 'createdAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'createdAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_8(value) {
  return result(true, 'createdAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_8(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'createdAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'createdAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'createdAt', 'MAX', 'above maximum', n);
  return result(true, 'createdAt', 'OK', 'within range', n);
}

function listRule_8(value) {
  const list = asArray(value);
  return result(true, 'createdAt', 'LIST', 'list normalized', list);
}

function objectRule_8(value) {
  const object = asObject(value);
  return result(true, 'createdAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_9(value) {
  if (!isDefined(value)) return result(false, 'updatedAt', 'REQUIRED', 'updatedAt'+' is required', value);
  return result(true, 'updatedAt', 'OK', 'updatedAt'+' is present', value);
}

function trimRule_9(value) {
  if (typeof value !== 'string') return result(true, 'updatedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'updatedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_9(value) {
  return result(true, 'updatedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_9(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'updatedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'updatedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'updatedAt', 'MAX', 'above maximum', n);
  return result(true, 'updatedAt', 'OK', 'within range', n);
}

function listRule_9(value) {
  const list = asArray(value);
  return result(true, 'updatedAt', 'LIST', 'list normalized', list);
}

function objectRule_9(value) {
  const object = asObject(value);
  return result(true, 'updatedAt', 'OBJECT', 'object normalized', object);
}

const RULES = Object.freeze({
  'id': Object.freeze([requiredRule_0, trimRule_0, nullRule_0, rangeRule_0, listRule_0, objectRule_0]),
  'paymentId': Object.freeze([requiredRule_1, trimRule_1, nullRule_1, rangeRule_1, listRule_1, objectRule_1]),
  'orderId': Object.freeze([requiredRule_2, trimRule_2, nullRule_2, rangeRule_2, listRule_2, objectRule_2]),
  'amount': Object.freeze([requiredRule_3, trimRule_3, nullRule_3, rangeRule_3, listRule_3, objectRule_3]),
  'reason': Object.freeze([requiredRule_4, trimRule_4, nullRule_4, rangeRule_4, listRule_4, objectRule_4]),
  'status': Object.freeze([requiredRule_5, trimRule_5, nullRule_5, rangeRule_5, listRule_5, objectRule_5]),
  'providerReference': Object.freeze([requiredRule_6, trimRule_6, nullRule_6, rangeRule_6, listRule_6, objectRule_6]),
  'processedAt': Object.freeze([requiredRule_7, trimRule_7, nullRule_7, rangeRule_7, listRule_7, objectRule_7]),
  'createdAt': Object.freeze([requiredRule_8, trimRule_8, nullRule_8, rangeRule_8, listRule_8, objectRule_8]),
  'updatedAt': Object.freeze([requiredRule_9, trimRule_9, nullRule_9, rangeRule_9, listRule_9, objectRule_9]),
});

function evaluateField(field, value, options = {}) {
  const rules = RULES[field] || [];
  const outputs = [];
  let current = value;
  for (const rule of rules) {
    const item = rule(current, options.min ?? null, options.max ?? null);
    outputs.push(item);
    if (!item.ok && options.stopOnError !== false) break;
    if (item.value !== undefined) current = item.value;
  }
  return { field, value: current, valid: outputs.every(x => x.ok), checks: outputs };
}

function evaluate(payload = {}, options = {}) {
  const fields = options.fields || FIELDS;
  const results = fields.map(field => evaluateField(field, payload[field], options));
  return { domain: DOMAIN, valid: results.every(x => x.valid), results };
}

function sanitize(payload = {}) {
  const output = {};
  for (const field of FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    const value = payload[field];
    output[field] = typeof value === 'string' ? value.trim() : value;
  }
  return output;
}

function pick(payload = {}, fields = FIELDS) {
  const output = {};
  for (const field of fields) if (FIELDS.includes(field)) output[field] = payload[field];
  return output;
}

function omit(payload = {}, fields = []) {
  const output = { ...payload };
  for (const field of fields) delete output[field];
  return output;
}

function diff(before = {}, after = {}) {
  const changes = {};
  for (const field of FIELDS) if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) changes[field] = { before: before[field], after: after[field] };
  return changes;
}

function applyDefaults(payload = {}, defaults = {}) {
  const output = { ...payload };
  for (const field of FIELDS) if (!isDefined(output[field]) && Object.prototype.hasOwnProperty.call(defaults, field)) output[field] = defaults[field];
  return output;
}

function buildFilter(criteria = {}) {
  return Object.fromEntries(Object.entries(criteria).filter(([key,value]) => FIELDS.includes(key) && isDefined(value)));
}

function match(record = {}, criteria = {}) {
  const filter = buildFilter(criteria);
  return Object.entries(filter).every(([key, expected]) => {
    const actual = record[key];
    if (Array.isArray(expected)) return expected.includes(actual);
    if (typeof expected === 'string' && typeof actual === 'string') return actual.toLowerCase().includes(expected.toLowerCase());
    return actual === expected;
  });
}

function summarize(records = []) {
  const total = records.length;
  const populated = Object.fromEntries(FIELDS.map(field => [field, records.filter(record => isDefined(record[field])).length]));
  return { domain: DOMAIN, total, populated };
}

module.exports = { DOMAIN, FIELDS, RULES, evaluateField, evaluate, sanitize, pick, omit, diff, applyDefaults, buildFilter, match, summarize };

function operation_0(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 0, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_1(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 1, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_2(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 2, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_3(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 3, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_4(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 4, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_5(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 5, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_6(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 6, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_7(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 7, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_8(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 8, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_9(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 9, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_10(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 10, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_11(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 11, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_12(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 12, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_13(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 13, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_14(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 14, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_15(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 15, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_16(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 16, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_17(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 17, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_18(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 18, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_19(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 19, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_20(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 20, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_21(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 21, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_22(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 22, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_23(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 23, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_24(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 24, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_25(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 25, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_26(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 26, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_27(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 27, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_28(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 28, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

function operation_29(payload = {}, options = {}) {
  const clean = sanitize(payload);
  const evaluated = evaluate(clean, { ...options, stopOnError: options.stopOnError !== false });
  const filter = buildFilter(options.filters || {});
  const selected = pick(clean, options.fields || FIELDS);
  return { operation: 29, domain: DOMAIN, valid: evaluated.valid, filter, selected, checks: evaluated.results.length };
}

for (let i = 0; i < 30; i += 1) {
  module.exports[`operation_${i}`] = (payload, options) => {
    const clean = sanitize(payload || {});
    const evaluated = evaluate(clean, options || {});
    return { operation: i, domain: DOMAIN, valid: evaluated.valid, data: clean, checks: evaluated.results };
  };
}
