'use strict';
// Policy engine for orders.
const DOMAIN = 'orders';
const FIELDS = ['id', 'number', 'buyerId', 'currency', 'subtotal', 'discount', 'shipping', 'tax', 'total', 'status', 'paymentStatus', 'fulfillmentStatus', 'shippingAddress', 'billingAddress', 'placedAt', 'confirmedAt', 'shippedAt', 'deliveredAt', 'cancelledAt', 'createdAt', 'updatedAt'];

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
  if (!isDefined(value)) return result(false, 'number', 'REQUIRED', 'number'+' is required', value);
  return result(true, 'number', 'OK', 'number'+' is present', value);
}

function trimRule_1(value) {
  if (typeof value !== 'string') return result(true, 'number', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'number', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_1(value) {
  return result(true, 'number', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_1(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'number', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'number', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'number', 'MAX', 'above maximum', n);
  return result(true, 'number', 'OK', 'within range', n);
}

function listRule_1(value) {
  const list = asArray(value);
  return result(true, 'number', 'LIST', 'list normalized', list);
}

function objectRule_1(value) {
  const object = asObject(value);
  return result(true, 'number', 'OBJECT', 'object normalized', object);
}

function requiredRule_2(value) {
  if (!isDefined(value)) return result(false, 'buyerId', 'REQUIRED', 'buyerId'+' is required', value);
  return result(true, 'buyerId', 'OK', 'buyerId'+' is present', value);
}

function trimRule_2(value) {
  if (typeof value !== 'string') return result(true, 'buyerId', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'buyerId', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_2(value) {
  return result(true, 'buyerId', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_2(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'buyerId', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'buyerId', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'buyerId', 'MAX', 'above maximum', n);
  return result(true, 'buyerId', 'OK', 'within range', n);
}

function listRule_2(value) {
  const list = asArray(value);
  return result(true, 'buyerId', 'LIST', 'list normalized', list);
}

function objectRule_2(value) {
  const object = asObject(value);
  return result(true, 'buyerId', 'OBJECT', 'object normalized', object);
}

function requiredRule_3(value) {
  if (!isDefined(value)) return result(false, 'currency', 'REQUIRED', 'currency'+' is required', value);
  return result(true, 'currency', 'OK', 'currency'+' is present', value);
}

function trimRule_3(value) {
  if (typeof value !== 'string') return result(true, 'currency', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'currency', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_3(value) {
  return result(true, 'currency', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_3(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'currency', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'currency', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'currency', 'MAX', 'above maximum', n);
  return result(true, 'currency', 'OK', 'within range', n);
}

function listRule_3(value) {
  const list = asArray(value);
  return result(true, 'currency', 'LIST', 'list normalized', list);
}

function objectRule_3(value) {
  const object = asObject(value);
  return result(true, 'currency', 'OBJECT', 'object normalized', object);
}

function requiredRule_4(value) {
  if (!isDefined(value)) return result(false, 'subtotal', 'REQUIRED', 'subtotal'+' is required', value);
  return result(true, 'subtotal', 'OK', 'subtotal'+' is present', value);
}

function trimRule_4(value) {
  if (typeof value !== 'string') return result(true, 'subtotal', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'subtotal', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_4(value) {
  return result(true, 'subtotal', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_4(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'subtotal', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'subtotal', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'subtotal', 'MAX', 'above maximum', n);
  return result(true, 'subtotal', 'OK', 'within range', n);
}

function listRule_4(value) {
  const list = asArray(value);
  return result(true, 'subtotal', 'LIST', 'list normalized', list);
}

function objectRule_4(value) {
  const object = asObject(value);
  return result(true, 'subtotal', 'OBJECT', 'object normalized', object);
}

function requiredRule_5(value) {
  if (!isDefined(value)) return result(false, 'discount', 'REQUIRED', 'discount'+' is required', value);
  return result(true, 'discount', 'OK', 'discount'+' is present', value);
}

function trimRule_5(value) {
  if (typeof value !== 'string') return result(true, 'discount', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'discount', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_5(value) {
  return result(true, 'discount', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_5(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'discount', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'discount', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'discount', 'MAX', 'above maximum', n);
  return result(true, 'discount', 'OK', 'within range', n);
}

function listRule_5(value) {
  const list = asArray(value);
  return result(true, 'discount', 'LIST', 'list normalized', list);
}

function objectRule_5(value) {
  const object = asObject(value);
  return result(true, 'discount', 'OBJECT', 'object normalized', object);
}

function requiredRule_6(value) {
  if (!isDefined(value)) return result(false, 'shipping', 'REQUIRED', 'shipping'+' is required', value);
  return result(true, 'shipping', 'OK', 'shipping'+' is present', value);
}

function trimRule_6(value) {
  if (typeof value !== 'string') return result(true, 'shipping', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'shipping', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_6(value) {
  return result(true, 'shipping', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_6(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'shipping', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'shipping', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'shipping', 'MAX', 'above maximum', n);
  return result(true, 'shipping', 'OK', 'within range', n);
}

function listRule_6(value) {
  const list = asArray(value);
  return result(true, 'shipping', 'LIST', 'list normalized', list);
}

function objectRule_6(value) {
  const object = asObject(value);
  return result(true, 'shipping', 'OBJECT', 'object normalized', object);
}

function requiredRule_7(value) {
  if (!isDefined(value)) return result(false, 'tax', 'REQUIRED', 'tax'+' is required', value);
  return result(true, 'tax', 'OK', 'tax'+' is present', value);
}

function trimRule_7(value) {
  if (typeof value !== 'string') return result(true, 'tax', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'tax', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_7(value) {
  return result(true, 'tax', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_7(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'tax', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'tax', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'tax', 'MAX', 'above maximum', n);
  return result(true, 'tax', 'OK', 'within range', n);
}

function listRule_7(value) {
  const list = asArray(value);
  return result(true, 'tax', 'LIST', 'list normalized', list);
}

function objectRule_7(value) {
  const object = asObject(value);
  return result(true, 'tax', 'OBJECT', 'object normalized', object);
}

function requiredRule_8(value) {
  if (!isDefined(value)) return result(false, 'total', 'REQUIRED', 'total'+' is required', value);
  return result(true, 'total', 'OK', 'total'+' is present', value);
}

function trimRule_8(value) {
  if (typeof value !== 'string') return result(true, 'total', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'total', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_8(value) {
  return result(true, 'total', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_8(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'total', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'total', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'total', 'MAX', 'above maximum', n);
  return result(true, 'total', 'OK', 'within range', n);
}

function listRule_8(value) {
  const list = asArray(value);
  return result(true, 'total', 'LIST', 'list normalized', list);
}

function objectRule_8(value) {
  const object = asObject(value);
  return result(true, 'total', 'OBJECT', 'object normalized', object);
}

function requiredRule_9(value) {
  if (!isDefined(value)) return result(false, 'status', 'REQUIRED', 'status'+' is required', value);
  return result(true, 'status', 'OK', 'status'+' is present', value);
}

function trimRule_9(value) {
  if (typeof value !== 'string') return result(true, 'status', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'status', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_9(value) {
  return result(true, 'status', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_9(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'status', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'status', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'status', 'MAX', 'above maximum', n);
  return result(true, 'status', 'OK', 'within range', n);
}

function listRule_9(value) {
  const list = asArray(value);
  return result(true, 'status', 'LIST', 'list normalized', list);
}

function objectRule_9(value) {
  const object = asObject(value);
  return result(true, 'status', 'OBJECT', 'object normalized', object);
}

function requiredRule_10(value) {
  if (!isDefined(value)) return result(false, 'paymentStatus', 'REQUIRED', 'paymentStatus'+' is required', value);
  return result(true, 'paymentStatus', 'OK', 'paymentStatus'+' is present', value);
}

function trimRule_10(value) {
  if (typeof value !== 'string') return result(true, 'paymentStatus', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'paymentStatus', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_10(value) {
  return result(true, 'paymentStatus', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_10(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'paymentStatus', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'paymentStatus', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'paymentStatus', 'MAX', 'above maximum', n);
  return result(true, 'paymentStatus', 'OK', 'within range', n);
}

function listRule_10(value) {
  const list = asArray(value);
  return result(true, 'paymentStatus', 'LIST', 'list normalized', list);
}

function objectRule_10(value) {
  const object = asObject(value);
  return result(true, 'paymentStatus', 'OBJECT', 'object normalized', object);
}

function requiredRule_11(value) {
  if (!isDefined(value)) return result(false, 'fulfillmentStatus', 'REQUIRED', 'fulfillmentStatus'+' is required', value);
  return result(true, 'fulfillmentStatus', 'OK', 'fulfillmentStatus'+' is present', value);
}

function trimRule_11(value) {
  if (typeof value !== 'string') return result(true, 'fulfillmentStatus', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'fulfillmentStatus', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_11(value) {
  return result(true, 'fulfillmentStatus', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_11(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'fulfillmentStatus', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'fulfillmentStatus', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'fulfillmentStatus', 'MAX', 'above maximum', n);
  return result(true, 'fulfillmentStatus', 'OK', 'within range', n);
}

function listRule_11(value) {
  const list = asArray(value);
  return result(true, 'fulfillmentStatus', 'LIST', 'list normalized', list);
}

function objectRule_11(value) {
  const object = asObject(value);
  return result(true, 'fulfillmentStatus', 'OBJECT', 'object normalized', object);
}

function requiredRule_12(value) {
  if (!isDefined(value)) return result(false, 'shippingAddress', 'REQUIRED', 'shippingAddress'+' is required', value);
  return result(true, 'shippingAddress', 'OK', 'shippingAddress'+' is present', value);
}

function trimRule_12(value) {
  if (typeof value !== 'string') return result(true, 'shippingAddress', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'shippingAddress', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_12(value) {
  return result(true, 'shippingAddress', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_12(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'shippingAddress', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'shippingAddress', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'shippingAddress', 'MAX', 'above maximum', n);
  return result(true, 'shippingAddress', 'OK', 'within range', n);
}

function listRule_12(value) {
  const list = asArray(value);
  return result(true, 'shippingAddress', 'LIST', 'list normalized', list);
}

function objectRule_12(value) {
  const object = asObject(value);
  return result(true, 'shippingAddress', 'OBJECT', 'object normalized', object);
}

function requiredRule_13(value) {
  if (!isDefined(value)) return result(false, 'billingAddress', 'REQUIRED', 'billingAddress'+' is required', value);
  return result(true, 'billingAddress', 'OK', 'billingAddress'+' is present', value);
}

function trimRule_13(value) {
  if (typeof value !== 'string') return result(true, 'billingAddress', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'billingAddress', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_13(value) {
  return result(true, 'billingAddress', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_13(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'billingAddress', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'billingAddress', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'billingAddress', 'MAX', 'above maximum', n);
  return result(true, 'billingAddress', 'OK', 'within range', n);
}

function listRule_13(value) {
  const list = asArray(value);
  return result(true, 'billingAddress', 'LIST', 'list normalized', list);
}

function objectRule_13(value) {
  const object = asObject(value);
  return result(true, 'billingAddress', 'OBJECT', 'object normalized', object);
}

function requiredRule_14(value) {
  if (!isDefined(value)) return result(false, 'placedAt', 'REQUIRED', 'placedAt'+' is required', value);
  return result(true, 'placedAt', 'OK', 'placedAt'+' is present', value);
}

function trimRule_14(value) {
  if (typeof value !== 'string') return result(true, 'placedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'placedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_14(value) {
  return result(true, 'placedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_14(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'placedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'placedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'placedAt', 'MAX', 'above maximum', n);
  return result(true, 'placedAt', 'OK', 'within range', n);
}

function listRule_14(value) {
  const list = asArray(value);
  return result(true, 'placedAt', 'LIST', 'list normalized', list);
}

function objectRule_14(value) {
  const object = asObject(value);
  return result(true, 'placedAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_15(value) {
  if (!isDefined(value)) return result(false, 'confirmedAt', 'REQUIRED', 'confirmedAt'+' is required', value);
  return result(true, 'confirmedAt', 'OK', 'confirmedAt'+' is present', value);
}

function trimRule_15(value) {
  if (typeof value !== 'string') return result(true, 'confirmedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'confirmedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_15(value) {
  return result(true, 'confirmedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_15(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'confirmedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'confirmedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'confirmedAt', 'MAX', 'above maximum', n);
  return result(true, 'confirmedAt', 'OK', 'within range', n);
}

function listRule_15(value) {
  const list = asArray(value);
  return result(true, 'confirmedAt', 'LIST', 'list normalized', list);
}

function objectRule_15(value) {
  const object = asObject(value);
  return result(true, 'confirmedAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_16(value) {
  if (!isDefined(value)) return result(false, 'shippedAt', 'REQUIRED', 'shippedAt'+' is required', value);
  return result(true, 'shippedAt', 'OK', 'shippedAt'+' is present', value);
}

function trimRule_16(value) {
  if (typeof value !== 'string') return result(true, 'shippedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'shippedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_16(value) {
  return result(true, 'shippedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_16(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'shippedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'shippedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'shippedAt', 'MAX', 'above maximum', n);
  return result(true, 'shippedAt', 'OK', 'within range', n);
}

function listRule_16(value) {
  const list = asArray(value);
  return result(true, 'shippedAt', 'LIST', 'list normalized', list);
}

function objectRule_16(value) {
  const object = asObject(value);
  return result(true, 'shippedAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_17(value) {
  if (!isDefined(value)) return result(false, 'deliveredAt', 'REQUIRED', 'deliveredAt'+' is required', value);
  return result(true, 'deliveredAt', 'OK', 'deliveredAt'+' is present', value);
}

function trimRule_17(value) {
  if (typeof value !== 'string') return result(true, 'deliveredAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'deliveredAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_17(value) {
  return result(true, 'deliveredAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_17(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'deliveredAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'deliveredAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'deliveredAt', 'MAX', 'above maximum', n);
  return result(true, 'deliveredAt', 'OK', 'within range', n);
}

function listRule_17(value) {
  const list = asArray(value);
  return result(true, 'deliveredAt', 'LIST', 'list normalized', list);
}

function objectRule_17(value) {
  const object = asObject(value);
  return result(true, 'deliveredAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_18(value) {
  if (!isDefined(value)) return result(false, 'cancelledAt', 'REQUIRED', 'cancelledAt'+' is required', value);
  return result(true, 'cancelledAt', 'OK', 'cancelledAt'+' is present', value);
}

function trimRule_18(value) {
  if (typeof value !== 'string') return result(true, 'cancelledAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'cancelledAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_18(value) {
  return result(true, 'cancelledAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_18(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'cancelledAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'cancelledAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'cancelledAt', 'MAX', 'above maximum', n);
  return result(true, 'cancelledAt', 'OK', 'within range', n);
}

function listRule_18(value) {
  const list = asArray(value);
  return result(true, 'cancelledAt', 'LIST', 'list normalized', list);
}

function objectRule_18(value) {
  const object = asObject(value);
  return result(true, 'cancelledAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_19(value) {
  if (!isDefined(value)) return result(false, 'createdAt', 'REQUIRED', 'createdAt'+' is required', value);
  return result(true, 'createdAt', 'OK', 'createdAt'+' is present', value);
}

function trimRule_19(value) {
  if (typeof value !== 'string') return result(true, 'createdAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'createdAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_19(value) {
  return result(true, 'createdAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_19(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'createdAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'createdAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'createdAt', 'MAX', 'above maximum', n);
  return result(true, 'createdAt', 'OK', 'within range', n);
}

function listRule_19(value) {
  const list = asArray(value);
  return result(true, 'createdAt', 'LIST', 'list normalized', list);
}

function objectRule_19(value) {
  const object = asObject(value);
  return result(true, 'createdAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_20(value) {
  if (!isDefined(value)) return result(false, 'updatedAt', 'REQUIRED', 'updatedAt'+' is required', value);
  return result(true, 'updatedAt', 'OK', 'updatedAt'+' is present', value);
}

function trimRule_20(value) {
  if (typeof value !== 'string') return result(true, 'updatedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'updatedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_20(value) {
  return result(true, 'updatedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_20(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'updatedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'updatedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'updatedAt', 'MAX', 'above maximum', n);
  return result(true, 'updatedAt', 'OK', 'within range', n);
}

function listRule_20(value) {
  const list = asArray(value);
  return result(true, 'updatedAt', 'LIST', 'list normalized', list);
}

function objectRule_20(value) {
  const object = asObject(value);
  return result(true, 'updatedAt', 'OBJECT', 'object normalized', object);
}

const RULES = Object.freeze({
  'id': Object.freeze([requiredRule_0, trimRule_0, nullRule_0, rangeRule_0, listRule_0, objectRule_0]),
  'number': Object.freeze([requiredRule_1, trimRule_1, nullRule_1, rangeRule_1, listRule_1, objectRule_1]),
  'buyerId': Object.freeze([requiredRule_2, trimRule_2, nullRule_2, rangeRule_2, listRule_2, objectRule_2]),
  'currency': Object.freeze([requiredRule_3, trimRule_3, nullRule_3, rangeRule_3, listRule_3, objectRule_3]),
  'subtotal': Object.freeze([requiredRule_4, trimRule_4, nullRule_4, rangeRule_4, listRule_4, objectRule_4]),
  'discount': Object.freeze([requiredRule_5, trimRule_5, nullRule_5, rangeRule_5, listRule_5, objectRule_5]),
  'shipping': Object.freeze([requiredRule_6, trimRule_6, nullRule_6, rangeRule_6, listRule_6, objectRule_6]),
  'tax': Object.freeze([requiredRule_7, trimRule_7, nullRule_7, rangeRule_7, listRule_7, objectRule_7]),
  'total': Object.freeze([requiredRule_8, trimRule_8, nullRule_8, rangeRule_8, listRule_8, objectRule_8]),
  'status': Object.freeze([requiredRule_9, trimRule_9, nullRule_9, rangeRule_9, listRule_9, objectRule_9]),
  'paymentStatus': Object.freeze([requiredRule_10, trimRule_10, nullRule_10, rangeRule_10, listRule_10, objectRule_10]),
  'fulfillmentStatus': Object.freeze([requiredRule_11, trimRule_11, nullRule_11, rangeRule_11, listRule_11, objectRule_11]),
  'shippingAddress': Object.freeze([requiredRule_12, trimRule_12, nullRule_12, rangeRule_12, listRule_12, objectRule_12]),
  'billingAddress': Object.freeze([requiredRule_13, trimRule_13, nullRule_13, rangeRule_13, listRule_13, objectRule_13]),
  'placedAt': Object.freeze([requiredRule_14, trimRule_14, nullRule_14, rangeRule_14, listRule_14, objectRule_14]),
  'confirmedAt': Object.freeze([requiredRule_15, trimRule_15, nullRule_15, rangeRule_15, listRule_15, objectRule_15]),
  'shippedAt': Object.freeze([requiredRule_16, trimRule_16, nullRule_16, rangeRule_16, listRule_16, objectRule_16]),
  'deliveredAt': Object.freeze([requiredRule_17, trimRule_17, nullRule_17, rangeRule_17, listRule_17, objectRule_17]),
  'cancelledAt': Object.freeze([requiredRule_18, trimRule_18, nullRule_18, rangeRule_18, listRule_18, objectRule_18]),
  'createdAt': Object.freeze([requiredRule_19, trimRule_19, nullRule_19, rangeRule_19, listRule_19, objectRule_19]),
  'updatedAt': Object.freeze([requiredRule_20, trimRule_20, nullRule_20, rangeRule_20, listRule_20, objectRule_20]),
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
