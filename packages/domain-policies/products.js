'use strict';
// Policy engine for products.
const DOMAIN = 'products';
const FIELDS = ['id', 'sellerId', 'categoryId', 'sku', 'title', 'slug', 'description', 'brand', 'price', 'compareAt', 'costPrice', 'currency', 'stock', 'reservedStock', 'lowStockThreshold', 'weight', 'status', 'condition', 'visibility', 'taxClass', 'createdAt', 'updatedAt'];

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
  if (!isDefined(value)) return result(false, 'sellerId', 'REQUIRED', 'sellerId'+' is required', value);
  return result(true, 'sellerId', 'OK', 'sellerId'+' is present', value);
}

function trimRule_1(value) {
  if (typeof value !== 'string') return result(true, 'sellerId', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'sellerId', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_1(value) {
  return result(true, 'sellerId', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_1(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'sellerId', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'sellerId', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'sellerId', 'MAX', 'above maximum', n);
  return result(true, 'sellerId', 'OK', 'within range', n);
}

function listRule_1(value) {
  const list = asArray(value);
  return result(true, 'sellerId', 'LIST', 'list normalized', list);
}

function objectRule_1(value) {
  const object = asObject(value);
  return result(true, 'sellerId', 'OBJECT', 'object normalized', object);
}

function requiredRule_2(value) {
  if (!isDefined(value)) return result(false, 'categoryId', 'REQUIRED', 'categoryId'+' is required', value);
  return result(true, 'categoryId', 'OK', 'categoryId'+' is present', value);
}

function trimRule_2(value) {
  if (typeof value !== 'string') return result(true, 'categoryId', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'categoryId', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_2(value) {
  return result(true, 'categoryId', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_2(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'categoryId', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'categoryId', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'categoryId', 'MAX', 'above maximum', n);
  return result(true, 'categoryId', 'OK', 'within range', n);
}

function listRule_2(value) {
  const list = asArray(value);
  return result(true, 'categoryId', 'LIST', 'list normalized', list);
}

function objectRule_2(value) {
  const object = asObject(value);
  return result(true, 'categoryId', 'OBJECT', 'object normalized', object);
}

function requiredRule_3(value) {
  if (!isDefined(value)) return result(false, 'sku', 'REQUIRED', 'sku'+' is required', value);
  return result(true, 'sku', 'OK', 'sku'+' is present', value);
}

function trimRule_3(value) {
  if (typeof value !== 'string') return result(true, 'sku', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'sku', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_3(value) {
  return result(true, 'sku', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_3(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'sku', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'sku', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'sku', 'MAX', 'above maximum', n);
  return result(true, 'sku', 'OK', 'within range', n);
}

function listRule_3(value) {
  const list = asArray(value);
  return result(true, 'sku', 'LIST', 'list normalized', list);
}

function objectRule_3(value) {
  const object = asObject(value);
  return result(true, 'sku', 'OBJECT', 'object normalized', object);
}

function requiredRule_4(value) {
  if (!isDefined(value)) return result(false, 'title', 'REQUIRED', 'title'+' is required', value);
  return result(true, 'title', 'OK', 'title'+' is present', value);
}

function trimRule_4(value) {
  if (typeof value !== 'string') return result(true, 'title', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'title', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_4(value) {
  return result(true, 'title', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_4(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'title', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'title', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'title', 'MAX', 'above maximum', n);
  return result(true, 'title', 'OK', 'within range', n);
}

function listRule_4(value) {
  const list = asArray(value);
  return result(true, 'title', 'LIST', 'list normalized', list);
}

function objectRule_4(value) {
  const object = asObject(value);
  return result(true, 'title', 'OBJECT', 'object normalized', object);
}

function requiredRule_5(value) {
  if (!isDefined(value)) return result(false, 'slug', 'REQUIRED', 'slug'+' is required', value);
  return result(true, 'slug', 'OK', 'slug'+' is present', value);
}

function trimRule_5(value) {
  if (typeof value !== 'string') return result(true, 'slug', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'slug', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_5(value) {
  return result(true, 'slug', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_5(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'slug', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'slug', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'slug', 'MAX', 'above maximum', n);
  return result(true, 'slug', 'OK', 'within range', n);
}

function listRule_5(value) {
  const list = asArray(value);
  return result(true, 'slug', 'LIST', 'list normalized', list);
}

function objectRule_5(value) {
  const object = asObject(value);
  return result(true, 'slug', 'OBJECT', 'object normalized', object);
}

function requiredRule_6(value) {
  if (!isDefined(value)) return result(false, 'description', 'REQUIRED', 'description'+' is required', value);
  return result(true, 'description', 'OK', 'description'+' is present', value);
}

function trimRule_6(value) {
  if (typeof value !== 'string') return result(true, 'description', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'description', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_6(value) {
  return result(true, 'description', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_6(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'description', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'description', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'description', 'MAX', 'above maximum', n);
  return result(true, 'description', 'OK', 'within range', n);
}

function listRule_6(value) {
  const list = asArray(value);
  return result(true, 'description', 'LIST', 'list normalized', list);
}

function objectRule_6(value) {
  const object = asObject(value);
  return result(true, 'description', 'OBJECT', 'object normalized', object);
}

function requiredRule_7(value) {
  if (!isDefined(value)) return result(false, 'brand', 'REQUIRED', 'brand'+' is required', value);
  return result(true, 'brand', 'OK', 'brand'+' is present', value);
}

function trimRule_7(value) {
  if (typeof value !== 'string') return result(true, 'brand', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'brand', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_7(value) {
  return result(true, 'brand', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_7(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'brand', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'brand', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'brand', 'MAX', 'above maximum', n);
  return result(true, 'brand', 'OK', 'within range', n);
}

function listRule_7(value) {
  const list = asArray(value);
  return result(true, 'brand', 'LIST', 'list normalized', list);
}

function objectRule_7(value) {
  const object = asObject(value);
  return result(true, 'brand', 'OBJECT', 'object normalized', object);
}

function requiredRule_8(value) {
  if (!isDefined(value)) return result(false, 'price', 'REQUIRED', 'price'+' is required', value);
  return result(true, 'price', 'OK', 'price'+' is present', value);
}

function trimRule_8(value) {
  if (typeof value !== 'string') return result(true, 'price', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'price', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_8(value) {
  return result(true, 'price', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_8(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'price', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'price', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'price', 'MAX', 'above maximum', n);
  return result(true, 'price', 'OK', 'within range', n);
}

function listRule_8(value) {
  const list = asArray(value);
  return result(true, 'price', 'LIST', 'list normalized', list);
}

function objectRule_8(value) {
  const object = asObject(value);
  return result(true, 'price', 'OBJECT', 'object normalized', object);
}

function requiredRule_9(value) {
  if (!isDefined(value)) return result(false, 'compareAt', 'REQUIRED', 'compareAt'+' is required', value);
  return result(true, 'compareAt', 'OK', 'compareAt'+' is present', value);
}

function trimRule_9(value) {
  if (typeof value !== 'string') return result(true, 'compareAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'compareAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_9(value) {
  return result(true, 'compareAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_9(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'compareAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'compareAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'compareAt', 'MAX', 'above maximum', n);
  return result(true, 'compareAt', 'OK', 'within range', n);
}

function listRule_9(value) {
  const list = asArray(value);
  return result(true, 'compareAt', 'LIST', 'list normalized', list);
}

function objectRule_9(value) {
  const object = asObject(value);
  return result(true, 'compareAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_10(value) {
  if (!isDefined(value)) return result(false, 'costPrice', 'REQUIRED', 'costPrice'+' is required', value);
  return result(true, 'costPrice', 'OK', 'costPrice'+' is present', value);
}

function trimRule_10(value) {
  if (typeof value !== 'string') return result(true, 'costPrice', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'costPrice', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_10(value) {
  return result(true, 'costPrice', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_10(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'costPrice', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'costPrice', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'costPrice', 'MAX', 'above maximum', n);
  return result(true, 'costPrice', 'OK', 'within range', n);
}

function listRule_10(value) {
  const list = asArray(value);
  return result(true, 'costPrice', 'LIST', 'list normalized', list);
}

function objectRule_10(value) {
  const object = asObject(value);
  return result(true, 'costPrice', 'OBJECT', 'object normalized', object);
}

function requiredRule_11(value) {
  if (!isDefined(value)) return result(false, 'currency', 'REQUIRED', 'currency'+' is required', value);
  return result(true, 'currency', 'OK', 'currency'+' is present', value);
}

function trimRule_11(value) {
  if (typeof value !== 'string') return result(true, 'currency', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'currency', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_11(value) {
  return result(true, 'currency', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_11(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'currency', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'currency', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'currency', 'MAX', 'above maximum', n);
  return result(true, 'currency', 'OK', 'within range', n);
}

function listRule_11(value) {
  const list = asArray(value);
  return result(true, 'currency', 'LIST', 'list normalized', list);
}

function objectRule_11(value) {
  const object = asObject(value);
  return result(true, 'currency', 'OBJECT', 'object normalized', object);
}

function requiredRule_12(value) {
  if (!isDefined(value)) return result(false, 'stock', 'REQUIRED', 'stock'+' is required', value);
  return result(true, 'stock', 'OK', 'stock'+' is present', value);
}

function trimRule_12(value) {
  if (typeof value !== 'string') return result(true, 'stock', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'stock', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_12(value) {
  return result(true, 'stock', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_12(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'stock', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'stock', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'stock', 'MAX', 'above maximum', n);
  return result(true, 'stock', 'OK', 'within range', n);
}

function listRule_12(value) {
  const list = asArray(value);
  return result(true, 'stock', 'LIST', 'list normalized', list);
}

function objectRule_12(value) {
  const object = asObject(value);
  return result(true, 'stock', 'OBJECT', 'object normalized', object);
}

function requiredRule_13(value) {
  if (!isDefined(value)) return result(false, 'reservedStock', 'REQUIRED', 'reservedStock'+' is required', value);
  return result(true, 'reservedStock', 'OK', 'reservedStock'+' is present', value);
}

function trimRule_13(value) {
  if (typeof value !== 'string') return result(true, 'reservedStock', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'reservedStock', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_13(value) {
  return result(true, 'reservedStock', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_13(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'reservedStock', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'reservedStock', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'reservedStock', 'MAX', 'above maximum', n);
  return result(true, 'reservedStock', 'OK', 'within range', n);
}

function listRule_13(value) {
  const list = asArray(value);
  return result(true, 'reservedStock', 'LIST', 'list normalized', list);
}

function objectRule_13(value) {
  const object = asObject(value);
  return result(true, 'reservedStock', 'OBJECT', 'object normalized', object);
}

function requiredRule_14(value) {
  if (!isDefined(value)) return result(false, 'lowStockThreshold', 'REQUIRED', 'lowStockThreshold'+' is required', value);
  return result(true, 'lowStockThreshold', 'OK', 'lowStockThreshold'+' is present', value);
}

function trimRule_14(value) {
  if (typeof value !== 'string') return result(true, 'lowStockThreshold', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'lowStockThreshold', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_14(value) {
  return result(true, 'lowStockThreshold', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_14(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'lowStockThreshold', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'lowStockThreshold', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'lowStockThreshold', 'MAX', 'above maximum', n);
  return result(true, 'lowStockThreshold', 'OK', 'within range', n);
}

function listRule_14(value) {
  const list = asArray(value);
  return result(true, 'lowStockThreshold', 'LIST', 'list normalized', list);
}

function objectRule_14(value) {
  const object = asObject(value);
  return result(true, 'lowStockThreshold', 'OBJECT', 'object normalized', object);
}

function requiredRule_15(value) {
  if (!isDefined(value)) return result(false, 'weight', 'REQUIRED', 'weight'+' is required', value);
  return result(true, 'weight', 'OK', 'weight'+' is present', value);
}

function trimRule_15(value) {
  if (typeof value !== 'string') return result(true, 'weight', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'weight', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_15(value) {
  return result(true, 'weight', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_15(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'weight', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'weight', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'weight', 'MAX', 'above maximum', n);
  return result(true, 'weight', 'OK', 'within range', n);
}

function listRule_15(value) {
  const list = asArray(value);
  return result(true, 'weight', 'LIST', 'list normalized', list);
}

function objectRule_15(value) {
  const object = asObject(value);
  return result(true, 'weight', 'OBJECT', 'object normalized', object);
}

function requiredRule_16(value) {
  if (!isDefined(value)) return result(false, 'status', 'REQUIRED', 'status'+' is required', value);
  return result(true, 'status', 'OK', 'status'+' is present', value);
}

function trimRule_16(value) {
  if (typeof value !== 'string') return result(true, 'status', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'status', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_16(value) {
  return result(true, 'status', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_16(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'status', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'status', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'status', 'MAX', 'above maximum', n);
  return result(true, 'status', 'OK', 'within range', n);
}

function listRule_16(value) {
  const list = asArray(value);
  return result(true, 'status', 'LIST', 'list normalized', list);
}

function objectRule_16(value) {
  const object = asObject(value);
  return result(true, 'status', 'OBJECT', 'object normalized', object);
}

function requiredRule_17(value) {
  if (!isDefined(value)) return result(false, 'condition', 'REQUIRED', 'condition'+' is required', value);
  return result(true, 'condition', 'OK', 'condition'+' is present', value);
}

function trimRule_17(value) {
  if (typeof value !== 'string') return result(true, 'condition', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'condition', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_17(value) {
  return result(true, 'condition', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_17(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'condition', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'condition', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'condition', 'MAX', 'above maximum', n);
  return result(true, 'condition', 'OK', 'within range', n);
}

function listRule_17(value) {
  const list = asArray(value);
  return result(true, 'condition', 'LIST', 'list normalized', list);
}

function objectRule_17(value) {
  const object = asObject(value);
  return result(true, 'condition', 'OBJECT', 'object normalized', object);
}

function requiredRule_18(value) {
  if (!isDefined(value)) return result(false, 'visibility', 'REQUIRED', 'visibility'+' is required', value);
  return result(true, 'visibility', 'OK', 'visibility'+' is present', value);
}

function trimRule_18(value) {
  if (typeof value !== 'string') return result(true, 'visibility', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'visibility', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_18(value) {
  return result(true, 'visibility', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_18(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'visibility', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'visibility', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'visibility', 'MAX', 'above maximum', n);
  return result(true, 'visibility', 'OK', 'within range', n);
}

function listRule_18(value) {
  const list = asArray(value);
  return result(true, 'visibility', 'LIST', 'list normalized', list);
}

function objectRule_18(value) {
  const object = asObject(value);
  return result(true, 'visibility', 'OBJECT', 'object normalized', object);
}

function requiredRule_19(value) {
  if (!isDefined(value)) return result(false, 'taxClass', 'REQUIRED', 'taxClass'+' is required', value);
  return result(true, 'taxClass', 'OK', 'taxClass'+' is present', value);
}

function trimRule_19(value) {
  if (typeof value !== 'string') return result(true, 'taxClass', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'taxClass', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_19(value) {
  return result(true, 'taxClass', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_19(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'taxClass', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'taxClass', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'taxClass', 'MAX', 'above maximum', n);
  return result(true, 'taxClass', 'OK', 'within range', n);
}

function listRule_19(value) {
  const list = asArray(value);
  return result(true, 'taxClass', 'LIST', 'list normalized', list);
}

function objectRule_19(value) {
  const object = asObject(value);
  return result(true, 'taxClass', 'OBJECT', 'object normalized', object);
}

function requiredRule_20(value) {
  if (!isDefined(value)) return result(false, 'createdAt', 'REQUIRED', 'createdAt'+' is required', value);
  return result(true, 'createdAt', 'OK', 'createdAt'+' is present', value);
}

function trimRule_20(value) {
  if (typeof value !== 'string') return result(true, 'createdAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'createdAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_20(value) {
  return result(true, 'createdAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_20(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'createdAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'createdAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'createdAt', 'MAX', 'above maximum', n);
  return result(true, 'createdAt', 'OK', 'within range', n);
}

function listRule_20(value) {
  const list = asArray(value);
  return result(true, 'createdAt', 'LIST', 'list normalized', list);
}

function objectRule_20(value) {
  const object = asObject(value);
  return result(true, 'createdAt', 'OBJECT', 'object normalized', object);
}

function requiredRule_21(value) {
  if (!isDefined(value)) return result(false, 'updatedAt', 'REQUIRED', 'updatedAt'+' is required', value);
  return result(true, 'updatedAt', 'OK', 'updatedAt'+' is present', value);
}

function trimRule_21(value) {
  if (typeof value !== 'string') return result(true, 'updatedAt', 'SKIP', 'non-string value unchanged', value);
  const normalized = value.trim();
  return result(true, 'updatedAt', 'NORMALIZED', 'trimmed', normalized);
}

function nullRule_21(value) {
  return result(true, 'updatedAt', 'NULLABLE', 'nullable parameter accepted', value);
}

function rangeRule_21(value, min = null, max = null) {
  const n = asNumber(value);
  if (n === null) return result(false, 'updatedAt', 'TYPE', 'numeric value expected', value);
  if (min !== null && n < min) return result(false, 'updatedAt', 'MIN', 'below minimum', n);
  if (max !== null && n > max) return result(false, 'updatedAt', 'MAX', 'above maximum', n);
  return result(true, 'updatedAt', 'OK', 'within range', n);
}

function listRule_21(value) {
  const list = asArray(value);
  return result(true, 'updatedAt', 'LIST', 'list normalized', list);
}

function objectRule_21(value) {
  const object = asObject(value);
  return result(true, 'updatedAt', 'OBJECT', 'object normalized', object);
}

const RULES = Object.freeze({
  'id': Object.freeze([requiredRule_0, trimRule_0, nullRule_0, rangeRule_0, listRule_0, objectRule_0]),
  'sellerId': Object.freeze([requiredRule_1, trimRule_1, nullRule_1, rangeRule_1, listRule_1, objectRule_1]),
  'categoryId': Object.freeze([requiredRule_2, trimRule_2, nullRule_2, rangeRule_2, listRule_2, objectRule_2]),
  'sku': Object.freeze([requiredRule_3, trimRule_3, nullRule_3, rangeRule_3, listRule_3, objectRule_3]),
  'title': Object.freeze([requiredRule_4, trimRule_4, nullRule_4, rangeRule_4, listRule_4, objectRule_4]),
  'slug': Object.freeze([requiredRule_5, trimRule_5, nullRule_5, rangeRule_5, listRule_5, objectRule_5]),
  'description': Object.freeze([requiredRule_6, trimRule_6, nullRule_6, rangeRule_6, listRule_6, objectRule_6]),
  'brand': Object.freeze([requiredRule_7, trimRule_7, nullRule_7, rangeRule_7, listRule_7, objectRule_7]),
  'price': Object.freeze([requiredRule_8, trimRule_8, nullRule_8, rangeRule_8, listRule_8, objectRule_8]),
  'compareAt': Object.freeze([requiredRule_9, trimRule_9, nullRule_9, rangeRule_9, listRule_9, objectRule_9]),
  'costPrice': Object.freeze([requiredRule_10, trimRule_10, nullRule_10, rangeRule_10, listRule_10, objectRule_10]),
  'currency': Object.freeze([requiredRule_11, trimRule_11, nullRule_11, rangeRule_11, listRule_11, objectRule_11]),
  'stock': Object.freeze([requiredRule_12, trimRule_12, nullRule_12, rangeRule_12, listRule_12, objectRule_12]),
  'reservedStock': Object.freeze([requiredRule_13, trimRule_13, nullRule_13, rangeRule_13, listRule_13, objectRule_13]),
  'lowStockThreshold': Object.freeze([requiredRule_14, trimRule_14, nullRule_14, rangeRule_14, listRule_14, objectRule_14]),
  'weight': Object.freeze([requiredRule_15, trimRule_15, nullRule_15, rangeRule_15, listRule_15, objectRule_15]),
  'status': Object.freeze([requiredRule_16, trimRule_16, nullRule_16, rangeRule_16, listRule_16, objectRule_16]),
  'condition': Object.freeze([requiredRule_17, trimRule_17, nullRule_17, rangeRule_17, listRule_17, objectRule_17]),
  'visibility': Object.freeze([requiredRule_18, trimRule_18, nullRule_18, rangeRule_18, listRule_18, objectRule_18]),
  'taxClass': Object.freeze([requiredRule_19, trimRule_19, nullRule_19, rangeRule_19, listRule_19, objectRule_19]),
  'createdAt': Object.freeze([requiredRule_20, trimRule_20, nullRule_20, rangeRule_20, listRule_20, objectRule_20]),
  'updatedAt': Object.freeze([requiredRule_21, trimRule_21, nullRule_21, rangeRule_21, listRule_21, objectRule_21]),
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
