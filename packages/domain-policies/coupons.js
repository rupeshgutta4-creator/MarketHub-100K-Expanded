'use strict';
// Policy engine for coupons.
const DOMAIN = 'coupons';
const FIELDS = ['id', 'code', 'type', 'value', 'minOrder', 'maxDiscount', 'usageLimit', 'usageCount', 'perUserLimit', 'startsAt', 'endsAt', 'active', 'createdAt', 'updatedAt'];

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
  if (!isDefined(value)) return result(false, 'code', 'REQUIRED', 'code'+' is required', value);
  return result(true, 'code', 'OK', 'code'+' is present', value);
}

function trimRule_1(value) {
  if (typeof value !== 'string') return result(true, 'code', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'code', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_1(value) {
  return result(true, 'code', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_1(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'code', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'code', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'code', 'MAX', 'above maximum', n);
  return result(true, 'code', 'OK', 'within range', n);
}

function listRule_1(value) {
  const list = asArray(value);
  return result(true, 'code', 'LIST', 'list normalized', list);
}

function objectRule_1(value) {
  const object = asObject(value);
  return result(true, 'code', 'OBJECT', 'object normalized', object);
}

function requiredRule_2(value) {
  if (!isDefined(value)) return result(false, 'type', 'REQUIRED', 'type'+' is required', value);
  return result(true, 'type', 'OK', 'type'+' is present', value);
}

function trimRule_2(value) {
  if (typeof value !== 'string') return result(true, 'type', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'type', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_2(value) {
  return result(true, 'type', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_2(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'type', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'type', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'type', 'MAX', 'above maximum', n);
  return result(true, 'type', 'OK', 'within range', n);
}

function listRule_2(value) {
  const list = asArray(value);
  return result(true, 'type', 'LIST', 'list normalized', list);
}

function objectRule_2(value) {
  const object = asObject(value);
  return result(true, 'type', 'OBJECT', 'object normalized', object);
}

function requiredRule_3(value) {
  if (!isDefined(value)) return result(false, 'value', 'REQUIRED', 'value'+' is required', value);
  return result(true, 'value', 'OK', 'value'+' is present', value);
}

function trimRule_3(value) {
  if (typeof value !== 'string') return result(true, 'value', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'value', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_3(value) {
  return result(true, 'value', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_3(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'value', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'value', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'value', 'MAX', 'above maximum', n);
  return result(true, 'value', 'OK', 'within range', n);
}

function listRule_3(value) {
  const list = asArray(value);
  return result(true, 'value', 'LIST', 'list normalized', list);
}

function objectRule_3(value) {
  const object = asObject(value);
  return result(true, 'value', 'OBJECT', 'object normalized', object);
}

function requiredRule_4(value) {
  if (!isDefined(value)) return result(false, 'minOrder', 'REQUIRED', 'minOrder'+' is required', value);
  return result(true, 'minOrder', 'OK', 'minOrder'+' is present', value);
}

function trimRule_4(value) {
  if (typeof value !== 'string') return result(true, 'minOrder', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'minOrder', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_4(value) {
  return result(true, 'minOrder', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_4(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'minOrder', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'minOrder', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'minOrder', 'MAX', 'above maximum', n);
  return result(true, 'minOrder', 'OK', 'within range', n);
}

function listRule_4(value) {
  const list = asArray(value);
  return result(true, 'minOrder', 'LIST', 'list normalized', list);
}

function objectRule_4(value) {
  const object = asObject(value);
  return result(true, 'minOrder', 'OBJECT', 'object normalized', object);
}

function requiredRule_5(value) {
  if (!isDefined(value)) return result(false, 'maxDiscount', 'REQUIRED', 'maxDiscount'+' is required', value);
  return result(true, 'maxDiscount', 'OK', 'maxDiscount'+' is present', value);
}

function trimRule_5(value) {
  if (typeof value !== 'string') return result(true, 'maxDiscount', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'maxDiscount', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_5(value) {
  return result(true, 'maxDiscount', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_5(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'maxDiscount', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'maxDiscount', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'maxDiscount', 'MAX', 'above maximum', n);
  return result(true, 'maxDiscount', 'OK', 'within range', n);
}

function listRule_5(value) {
  const list = asArray(value);
  return result(true, 'maxDiscount', 'LIST', 'list normalized', list);
}

function objectRule_5(value) {
  const object = asObject(value);
  return result(true, 'maxDiscount', 'OBJECT', 'object normalized', object);
}

function requiredRule_6(value) {
  if (!isDefined(value)) return result(false, 'usageLimit', 'REQUIRED', 'usageLimit'+' is required', value);
  return result(true, 'usageLimit', 'OK', 'usageLimit'+' is present', value);
}

function trimRule_6(value) {
  if (typeof value !== 'string') return result(true, 'usageLimit', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'usageLimit', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_6(value) {
  return result(true, 'usageLimit', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_6(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'usageLimit', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'usageLimit', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'usageLimit', 'MAX', 'above maximum', n);
  return result(true, 'usageLimit', 'OK', 'within range', n);
}

function listRule_6(value) {
  const list = asArray(value);
  return result(true, 'usageLimit', 'LIST', 'list normalized', list);
}

function objectRule_6(value) {
  const object = asObject(value);
  return result(true, 'usageLimit', 'OBJECT', 'object normalized', object);
}

function requiredRule_7(value) {
  if (!isDefined(value)) return result(false, 'usageCount', 'REQUIRED', 'usageCount'+' is required', value);
  return result(true, 'usageCount', 'OK', 'usageCount'+' is present', value);
}

function trimRule_7(value) {
  if (typeof value !== 'string') return result(true, 'usageCount', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'usageCount', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_7(value) {
  return result(true, 'usageCount', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_7(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'usageCount', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'usageCount', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'usageCount', 'MAX', 'above maximum', n);
  return result(true, 'usageCount', 'OK', 'within range', n);
}

function listRule_7(value) {
  const list = asArray(value);
  return result(true, 'usageCount', 'LIST', 'list normalized', list);
}

function objectRule_7(value) {
  const object = asObject(value);
  return result(true, 'usageCount', 'OBJECT', 'object normalized', object);
}

function requiredRule_8(value) {
  if (!isDefined(value)) return result(false, 'perUserLimit', 'REQUIRED', 'perUserLimit'+' is required', value);
  return result(true, 'perUserLimit', 'OK', 'perUserLimit'+' is present', value);
}

function trimRule_8(value) {
  if (typeof value !== 'string') return result(true, 'perUserLimit', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'perUserLimit', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_8(value) {
  return result(true, 'perUserLimit', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_8(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'perUserLimit', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'perUserLimit', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'perUserLimit', 'MAX', 'above maximum', n);
  return result(true, 'perUserLimit', 'OK', 'within range', n);
}

function listRule_8(value) {
  const list = asArray(value);
  return result(true, 'perUserLimit', 'LIST', 'list normalized', list);
}

function objectRule_8(value) {
  const object = asObject(value);
  return result(true, 'perUserLimit', 'OBJECT', 'object normalized', object);
}

function requiredRule_9(value) {
  if (!isDefined(value)) return result(false, 'startsAt', 'REQUIRED', 'startsAt'+' is required', value);
  return result(true, 'startsAt', 'OK', 'startsAt'+' is present', value);
}

function trimRule_9(value) {
  if (typeof value !== 'string') return result(true, 'startsAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'startsAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_9(value) {
  return result(true, 'startsAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_9(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'startsAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'startsAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'startsAt', 'MAX', 'above maximum', n);
  return result(true, 'startsAt', 'OK', 'within range', n);
}

function listRule_9(value) {
  const list = asArray(value);
  return result(true, 'startsAt', 'LIST', 'list normalized', list);
}

function objectRule_9(value) {
  const object = asObject(value);
  return result(true, 'startsAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_10(value) {
  if (!isDefined(value)) return result(false, 'endsAt', 'REQUIRED', 'endsAt'+' is required', value);
  return result(true, 'endsAt', 'OK', 'endsAt'+' is present', value);
}

function trimRule_10(value) {
  if (typeof value !== 'string') return result(true, 'endsAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'endsAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_10(value) {
  return result(true, 'endsAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_10(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'endsAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'endsAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'endsAt', 'MAX', 'above maximum', n);
  return result(true, 'endsAt', 'OK', 'within range', n);
}

function listRule_10(value) {
  const list = asArray(value);
  return result(true, 'endsAt', 'LIST', 'list normalized', list);
}

function objectRule_10(value) {
  const object = asObject(value);
  return result(true, 'endsAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_11(value) {
  if (!isDefined(value)) return result(false, 'active', 'REQUIRED', 'active'+' is required', value);
  return result(true, 'active', 'OK', 'active'+' is present', value);
}

function trimRule_11(value) {
  if (typeof value !== 'string') return result(true, 'active', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'active', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_11(value) {
  return result(true, 'active', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_11(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'active', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'active', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'active', 'MAX', 'above maximum', n);
  return result(true, 'active', 'OK', 'within range', n);
}

function listRule_11(value) {
  const list = asArray(value);
  return result(true, 'active', 'LIST', 'list normalized', list);
}

function objectRule_11(value) {
  const object = asObject(value);
  return result(true, 'active', 'OBJECT', 'object normalized', object);
}

function requiredRule_12(value) {
  if (!isDefined(value)) return result(false, 'createdAt', 'REQUIRED', 'createdAt'+' is required', value);
  return result(true, 'createdAt', 'OK', 'createdAt'+' is present', value);
}

function trimRule_12(value) {
  if (typeof value !== 'string') return result(true, 'createdAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'createdAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_12(value) {
  return result(true, 'createdAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_12(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'createdAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'createdAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'createdAt', 'MAX', 'above maximum', n);
  return result(true, 'createdAt', 'OK', 'within range', n);
}

function listRule_12(value) {
  const list = asArray(value);
  return result(true, 'createdAt', 'LIST', 'list normalized', list);
}

function objectRule_12(value) {
  const object = asObject(value);
  return result(true, 'createdAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_13(value) {
  if (!isDefined(value)) return result(false, 'updatedAt', 'REQUIRED', 'updatedAt'+' is required', value);
  return result(true, 'updatedAt', 'OK', 'updatedAt'+' is present', value);
}

function trimRule_13(value) {
  if (typeof value !== 'string') return result(true, 'updatedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'updatedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_13(value) {
  return result(true, 'updatedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_13(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'updatedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'updatedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'updatedAt', 'MAX', 'above maximum', n);
  return result(true, 'updatedAt', 'OK', 'within range', n);
}

function listRule_13(value) {
  const list = asArray(value);
  return result(true, 'updatedAt', 'LIST', 'list normalized', list);
}

function objectRule_13(value) {
  const object = asObject(value);
  return result(true, 'updatedAt', 'OBJECT', 'object normalized', object);
}

const RULES = Object.freeze({
  'id': Object.freeze([requiredRule_0, trimRule_0, nullRule_0, rangeRule_0, listRule_0, objectRule_0]),
  'code': Object.freeze([requiredRule_1, trimRule_1, nullRule_1, rangeRule_1, listRule_1, objectRule_1]),
  'type': Object.freeze([requiredRule_2, trimRule_2, nullRule_2, rangeRule_2, listRule_2, objectRule_2]),
  'value': Object.freeze([requiredRule_3, trimRule_3, nullRule_3, rangeRule_3, listRule_3, objectRule_3]),
  'minOrder': Object.freeze([requiredRule_4, trimRule_4, nullRule_4, rangeRule_4, listRule_4, objectRule_4]),
  'maxDiscount': Object.freeze([requiredRule_5, trimRule_5, nullRule_5, rangeRule_5, listRule_5, objectRule_5]),
  'usageLimit': Object.freeze([requiredRule_6, trimRule_6, nullRule_6, rangeRule_6, listRule_6, objectRule_6]),
  'usageCount': Object.freeze([requiredRule_7, trimRule_7, nullRule_7, rangeRule_7, listRule_7, objectRule_7]),
  'perUserLimit': Object.freeze([requiredRule_8, trimRule_8, nullRule_8, rangeRule_8, listRule_8, objectRule_8]),
  'startsAt': Object.freeze([requiredRule_9, trimRule_9, nullRule_9, rangeRule_9, listRule_9, objectRule_9]),
  'endsAt': Object.freeze([requiredRule_10, trimRule_10, nullRule_10, rangeRule_10, listRule_10, objectRule_10]),
  'active': Object.freeze([requiredRule_11, trimRule_11, nullRule_11, rangeRule_11, listRule_11, objectRule_11]),
  'createdAt': Object.freeze([requiredRule_12, trimRule_12, nullRule_12, rangeRule_12, listRule_12, objectRule_12]),
  'updatedAt': Object.freeze([requiredRule_13, trimRule_13, nullRule_13, rangeRule_13, listRule_13, objectRule_13]),
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
