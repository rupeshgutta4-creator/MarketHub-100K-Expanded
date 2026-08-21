
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'products';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'sellerId', 'categoryId', 'sku', 'title', 'slug', 'description', 'brand', 'price', 'compareAt', 'costPrice', 'currency', 'stock', 'reservedStock', 'lowStockThreshold', 'weight', 'status', 'condition', 'visibility', 'taxClass', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sellerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'categoryId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sku': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'title': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'slug': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'description': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'brand': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'price': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'compareAt': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'costPrice': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'currency': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'stock': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'reservedStock': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'lowStockThreshold': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'weight': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'condition': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'visibility': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'taxClass': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'createdAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'updatedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
});

function clone(value) {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  return fallback;
}

function normalizeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeField(field, value) {
  const definition = PARAMETER_DEFINITIONS[field];
  if (!definition) return value;
  if (definition.type === 'number') return normalizeNumber(value);
  if (definition.type === 'boolean') return normalizeBoolean(value);
  if (definition.type === 'array') return Array.isArray(value) ? clone(value) : [];
  if (definition.type === 'object') return value && typeof value === 'object' ? clone(value) : {};
  return normalizeString(value);
}

function normalizePayload(input = {}) {
  const output = {};
  for (const field of FIELD_NAMES) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = normalizeField(field, input[field]);
    }
  }
  return output;
}

function validatePayload(input = {}, options = {}) {
  const errors = [];
  const value = normalizePayload(input);
  const partial = Boolean(options.partial);
  for (const field of FIELD_NAMES) {
    const definition = PARAMETER_DEFINITIONS[field];
    const current = value[field];
    if (!partial && definition.required && (current === undefined || current === '')) {
      errors.push({ field, code: 'REQUIRED', message: `${field} is required` });
    }
    if (definition.type === 'number' && current !== undefined && !Number.isFinite(current)) {
      errors.push({ field, code: 'NUMBER', message: `${field} must be numeric` });
    }
  }
  return { valid: errors.length === 0, errors, value };
}

function matches(record, filters = {}) {
  for (const [field, expected] of Object.entries(filters || {})) {
    if (!FIELD_SET.has(field)) continue;
    if (expected === undefined || expected === null || expected === '') continue;
    const actual = record[field];
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (typeof expected === 'string' && typeof actual === 'string') {
      if (!actual.toLowerCase().includes(expected.toLowerCase())) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function project(record, fields) {
  if (!Array.isArray(fields) || fields.length === 0) return clone(record);
  const output = {};
  for (const field of fields) {
    if (FIELD_SET.has(field)) output[field] = clone(record[field]);
  }
  return output;
}

function sortRecords(records, sortBy, direction = 'asc') {
  if (!sortBy || !FIELD_SET.has(sortBy)) return records;
  const sign = String(direction).toLowerCase() === 'desc' ? -1 : 1;
  return records.sort((left, right) => {
    const a = left[sortBy];
    const b = right[sortBy];
    if (a === b) return 0;
    if (a === undefined || a === null) return -1 * sign;
    if (b === undefined || b === null) return 1 * sign;
    return (a < b ? -1 : 1) * sign;
  });
}

function paginate(records, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, Math.floor(normalizeNumber(page, 1)));
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(normalizeNumber(pageSize, DEFAULT_PAGE_SIZE))));
  const pages = Math.max(1, Math.ceil(records.length / safeSize));
  const currentPage = Math.min(safePage, pages);
  const start = (currentPage - 1) * safeSize;
  return {
    data: records.slice(start, start + safeSize),
    total: records.length,
    page: currentPage,
    pageSize: safeSize,
    pages
  };
}

class DomainRepository {
  constructor(seed = []) {
    this.records = [];
    this.sequence = 0;
    seed.forEach(item => this.create(item));
  }

  nextId() {
    this.sequence += 1;
    return `${MODULE_NAME}-${String(this.sequence).padStart(8, '0')}`;
  }

  create(input = {}) {
    const checked = validatePayload(input);
    if (!checked.valid) {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION';
      error.details = checked.errors;
      throw error;
    }
    const timestamp = new Date().toISOString();
    const record = {
      ...checked.value,
      id: checked.value.id || this.nextId(),
      createdAt: checked.value.createdAt || timestamp,
      updatedAt: timestamp
    };
    this.records.push(record);
    return clone(record);
  }

  findById(id) {
    return clone(this.records.find(record => record.id === id) || null);
  }

  updateById(id, patch = {}) {
    const index = this.records.findIndex(record => record.id === id);
    if (index < 0) return null;
    const checked = validatePayload({ ...this.records[index], ...patch }, { partial: true });
    if (!checked.valid) {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION';
      error.details = checked.errors;
      throw error;
    }
    this.records[index] = {
      ...this.records[index],
      ...checked.value,
      id,
      updatedAt: new Date().toISOString()
    };
    return clone(this.records[index]);
  }

  deleteById(id) {
    const index = this.records.findIndex(record => record.id === id);
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }

  query(options = {}) {
    let rows = this.records.filter(record => matches(record, options.filters));
    if (options.search) {
      const needle = String(options.search).toLowerCase();
      rows = rows.filter(record =>
        FIELD_NAMES.some(field => String(record[field] ?? '').toLowerCase().includes(needle))
      );
    }
    sortRecords(rows, options.sortBy, options.direction);
    const projected = options.fields
      ? rows.map(row => project(row, options.fields))
      : rows.map(clone);
    return paginate(projected, options.page, options.pageSize);
  }

  count(filters = {}) {
    return this.records.filter(record => matches(record, filters)).length;
  }

  exists(filters = {}) {
    return this.records.some(record => matches(record, filters));
  }

  clear() {
    this.records.length = 0;
  }

  snapshot() {
    return clone(this.records);
  }
}

function createDefaultParameters() {
  const values = {};
  for (const field of FIELD_NAMES) {
    const type = PARAMETER_DEFINITIONS[field].type;
    values[field] =
      type === 'number' ? 0 :
      type === 'boolean' ? false :
      type === 'array' ? [] :
      type === 'object' ? {} : '';
  }
  return values;
}

function describeParameter(field) {
  if (!FIELD_SET.has(field)) return null;
  return { name: field, ...PARAMETER_DEFINITIONS[field] };
}

function listParameters() {
  return FIELD_NAMES.map(describeParameter);
}


function getid(record) {
  return record ? clone(record['id']) : undefined;
}

function setid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['id'] = normalizeField('id', value);
  return record;
}

function hasid(record) {
  return Boolean(record && record['id'] !== undefined && record['id'] !== null && record['id'] !== '');
}

function clearid(record) {
  if (record) delete record['id'];
  return record;
}

function validateid(value) {
  const result = validatePayload({ 'id': value }, { partial: true });
  return result.errors.filter(error => error.field === 'id');
}

function describeid() {
  return describeParameter('id');
}

function defaultid() {
  return createDefaultParameters()['id'];
}

const idParameter = Object.freeze({
  name: 'id',
  definition: PARAMETER_DEFINITIONS['id'],
  get: getid,
  set: setid,
  has: hasid,
  clear: clearid,
  validate: validateid,
  describe: describeid,
  defaultValue: defaultid
});


function getsellerid(record) {
  return record ? clone(record['sellerId']) : undefined;
}

function setsellerid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['sellerId'] = normalizeField('sellerId', value);
  return record;
}

function hassellerid(record) {
  return Boolean(record && record['sellerId'] !== undefined && record['sellerId'] !== null && record['sellerId'] !== '');
}

function clearsellerid(record) {
  if (record) delete record['sellerId'];
  return record;
}

function validatesellerid(value) {
  const result = validatePayload({ 'sellerId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'sellerId');
}

function describesellerid() {
  return describeParameter('sellerId');
}

function defaultsellerid() {
  return createDefaultParameters()['sellerId'];
}

const selleridParameter = Object.freeze({
  name: 'sellerId',
  definition: PARAMETER_DEFINITIONS['sellerId'],
  get: getsellerid,
  set: setsellerid,
  has: hassellerid,
  clear: clearsellerid,
  validate: validatesellerid,
  describe: describesellerid,
  defaultValue: defaultsellerid
});


function getcategoryid(record) {
  return record ? clone(record['categoryId']) : undefined;
}

function setcategoryid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['categoryId'] = normalizeField('categoryId', value);
  return record;
}

function hascategoryid(record) {
  return Boolean(record && record['categoryId'] !== undefined && record['categoryId'] !== null && record['categoryId'] !== '');
}

function clearcategoryid(record) {
  if (record) delete record['categoryId'];
  return record;
}

function validatecategoryid(value) {
  const result = validatePayload({ 'categoryId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'categoryId');
}

function describecategoryid() {
  return describeParameter('categoryId');
}

function defaultcategoryid() {
  return createDefaultParameters()['categoryId'];
}

const categoryidParameter = Object.freeze({
  name: 'categoryId',
  definition: PARAMETER_DEFINITIONS['categoryId'],
  get: getcategoryid,
  set: setcategoryid,
  has: hascategoryid,
  clear: clearcategoryid,
  validate: validatecategoryid,
  describe: describecategoryid,
  defaultValue: defaultcategoryid
});


function getsku(record) {
  return record ? clone(record['sku']) : undefined;
}

function setsku(record, value) {
  if (!record) throw new TypeError('record is required');
  record['sku'] = normalizeField('sku', value);
  return record;
}

function hassku(record) {
  return Boolean(record && record['sku'] !== undefined && record['sku'] !== null && record['sku'] !== '');
}

function clearsku(record) {
  if (record) delete record['sku'];
  return record;
}

function validatesku(value) {
  const result = validatePayload({ 'sku': value }, { partial: true });
  return result.errors.filter(error => error.field === 'sku');
}

function describesku() {
  return describeParameter('sku');
}

function defaultsku() {
  return createDefaultParameters()['sku'];
}

const skuParameter = Object.freeze({
  name: 'sku',
  definition: PARAMETER_DEFINITIONS['sku'],
  get: getsku,
  set: setsku,
  has: hassku,
  clear: clearsku,
  validate: validatesku,
  describe: describesku,
  defaultValue: defaultsku
});


function gettitle(record) {
  return record ? clone(record['title']) : undefined;
}

function settitle(record, value) {
  if (!record) throw new TypeError('record is required');
  record['title'] = normalizeField('title', value);
  return record;
}

function hastitle(record) {
  return Boolean(record && record['title'] !== undefined && record['title'] !== null && record['title'] !== '');
}

function cleartitle(record) {
  if (record) delete record['title'];
  return record;
}

function validatetitle(value) {
  const result = validatePayload({ 'title': value }, { partial: true });
  return result.errors.filter(error => error.field === 'title');
}

function describetitle() {
  return describeParameter('title');
}

function defaulttitle() {
  return createDefaultParameters()['title'];
}

const titleParameter = Object.freeze({
  name: 'title',
  definition: PARAMETER_DEFINITIONS['title'],
  get: gettitle,
  set: settitle,
  has: hastitle,
  clear: cleartitle,
  validate: validatetitle,
  describe: describetitle,
  defaultValue: defaulttitle
});


function getslug(record) {
  return record ? clone(record['slug']) : undefined;
}

function setslug(record, value) {
  if (!record) throw new TypeError('record is required');
  record['slug'] = normalizeField('slug', value);
  return record;
}

function hasslug(record) {
  return Boolean(record && record['slug'] !== undefined && record['slug'] !== null && record['slug'] !== '');
}

function clearslug(record) {
  if (record) delete record['slug'];
  return record;
}

function validateslug(value) {
  const result = validatePayload({ 'slug': value }, { partial: true });
  return result.errors.filter(error => error.field === 'slug');
}

function describeslug() {
  return describeParameter('slug');
}

function defaultslug() {
  return createDefaultParameters()['slug'];
}

const slugParameter = Object.freeze({
  name: 'slug',
  definition: PARAMETER_DEFINITIONS['slug'],
  get: getslug,
  set: setslug,
  has: hasslug,
  clear: clearslug,
  validate: validateslug,
  describe: describeslug,
  defaultValue: defaultslug
});


function getdescription(record) {
  return record ? clone(record['description']) : undefined;
}

function setdescription(record, value) {
  if (!record) throw new TypeError('record is required');
  record['description'] = normalizeField('description', value);
  return record;
}

function hasdescription(record) {
  return Boolean(record && record['description'] !== undefined && record['description'] !== null && record['description'] !== '');
}

function cleardescription(record) {
  if (record) delete record['description'];
  return record;
}

function validatedescription(value) {
  const result = validatePayload({ 'description': value }, { partial: true });
  return result.errors.filter(error => error.field === 'description');
}

function describedescription() {
  return describeParameter('description');
}

function defaultdescription() {
  return createDefaultParameters()['description'];
}

const descriptionParameter = Object.freeze({
  name: 'description',
  definition: PARAMETER_DEFINITIONS['description'],
  get: getdescription,
  set: setdescription,
  has: hasdescription,
  clear: cleardescription,
  validate: validatedescription,
  describe: describedescription,
  defaultValue: defaultdescription
});


function getbrand(record) {
  return record ? clone(record['brand']) : undefined;
}

function setbrand(record, value) {
  if (!record) throw new TypeError('record is required');
  record['brand'] = normalizeField('brand', value);
  return record;
}

function hasbrand(record) {
  return Boolean(record && record['brand'] !== undefined && record['brand'] !== null && record['brand'] !== '');
}

function clearbrand(record) {
  if (record) delete record['brand'];
  return record;
}

function validatebrand(value) {
  const result = validatePayload({ 'brand': value }, { partial: true });
  return result.errors.filter(error => error.field === 'brand');
}

function describebrand() {
  return describeParameter('brand');
}

function defaultbrand() {
  return createDefaultParameters()['brand'];
}

const brandParameter = Object.freeze({
  name: 'brand',
  definition: PARAMETER_DEFINITIONS['brand'],
  get: getbrand,
  set: setbrand,
  has: hasbrand,
  clear: clearbrand,
  validate: validatebrand,
  describe: describebrand,
  defaultValue: defaultbrand
});


function getprice(record) {
  return record ? clone(record['price']) : undefined;
}

function setprice(record, value) {
  if (!record) throw new TypeError('record is required');
  record['price'] = normalizeField('price', value);
  return record;
}

function hasprice(record) {
  return Boolean(record && record['price'] !== undefined && record['price'] !== null && record['price'] !== '');
}

function clearprice(record) {
  if (record) delete record['price'];
  return record;
}

function validateprice(value) {
  const result = validatePayload({ 'price': value }, { partial: true });
  return result.errors.filter(error => error.field === 'price');
}

function describeprice() {
  return describeParameter('price');
}

function defaultprice() {
  return createDefaultParameters()['price'];
}

const priceParameter = Object.freeze({
  name: 'price',
  definition: PARAMETER_DEFINITIONS['price'],
  get: getprice,
  set: setprice,
  has: hasprice,
  clear: clearprice,
  validate: validateprice,
  describe: describeprice,
  defaultValue: defaultprice
});


function getcompareat(record) {
  return record ? clone(record['compareAt']) : undefined;
}

function setcompareat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['compareAt'] = normalizeField('compareAt', value);
  return record;
}

function hascompareat(record) {
  return Boolean(record && record['compareAt'] !== undefined && record['compareAt'] !== null && record['compareAt'] !== '');
}

function clearcompareat(record) {
  if (record) delete record['compareAt'];
  return record;
}

function validatecompareat(value) {
  const result = validatePayload({ 'compareAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'compareAt');
}

function describecompareat() {
  return describeParameter('compareAt');
}

function defaultcompareat() {
  return createDefaultParameters()['compareAt'];
}

const compareatParameter = Object.freeze({
  name: 'compareAt',
  definition: PARAMETER_DEFINITIONS['compareAt'],
  get: getcompareat,
  set: setcompareat,
  has: hascompareat,
  clear: clearcompareat,
  validate: validatecompareat,
  describe: describecompareat,
  defaultValue: defaultcompareat
});


function getcostprice(record) {
  return record ? clone(record['costPrice']) : undefined;
}

function setcostprice(record, value) {
  if (!record) throw new TypeError('record is required');
  record['costPrice'] = normalizeField('costPrice', value);
  return record;
}

function hascostprice(record) {
  return Boolean(record && record['costPrice'] !== undefined && record['costPrice'] !== null && record['costPrice'] !== '');
}

function clearcostprice(record) {
  if (record) delete record['costPrice'];
  return record;
}

function validatecostprice(value) {
  const result = validatePayload({ 'costPrice': value }, { partial: true });
  return result.errors.filter(error => error.field === 'costPrice');
}

function describecostprice() {
  return describeParameter('costPrice');
}

function defaultcostprice() {
  return createDefaultParameters()['costPrice'];
}

const costpriceParameter = Object.freeze({
  name: 'costPrice',
  definition: PARAMETER_DEFINITIONS['costPrice'],
  get: getcostprice,
  set: setcostprice,
  has: hascostprice,
  clear: clearcostprice,
  validate: validatecostprice,
  describe: describecostprice,
  defaultValue: defaultcostprice
});


function getcurrency(record) {
  return record ? clone(record['currency']) : undefined;
}

function setcurrency(record, value) {
  if (!record) throw new TypeError('record is required');
  record['currency'] = normalizeField('currency', value);
  return record;
}

function hascurrency(record) {
  return Boolean(record && record['currency'] !== undefined && record['currency'] !== null && record['currency'] !== '');
}

function clearcurrency(record) {
  if (record) delete record['currency'];
  return record;
}

function validatecurrency(value) {
  const result = validatePayload({ 'currency': value }, { partial: true });
  return result.errors.filter(error => error.field === 'currency');
}

function describecurrency() {
  return describeParameter('currency');
}

function defaultcurrency() {
  return createDefaultParameters()['currency'];
}

const currencyParameter = Object.freeze({
  name: 'currency',
  definition: PARAMETER_DEFINITIONS['currency'],
  get: getcurrency,
  set: setcurrency,
  has: hascurrency,
  clear: clearcurrency,
  validate: validatecurrency,
  describe: describecurrency,
  defaultValue: defaultcurrency
});


function getstock(record) {
  return record ? clone(record['stock']) : undefined;
}

function setstock(record, value) {
  if (!record) throw new TypeError('record is required');
  record['stock'] = normalizeField('stock', value);
  return record;
}

function hasstock(record) {
  return Boolean(record && record['stock'] !== undefined && record['stock'] !== null && record['stock'] !== '');
}

function clearstock(record) {
  if (record) delete record['stock'];
  return record;
}

function validatestock(value) {
  const result = validatePayload({ 'stock': value }, { partial: true });
  return result.errors.filter(error => error.field === 'stock');
}

function describestock() {
  return describeParameter('stock');
}

function defaultstock() {
  return createDefaultParameters()['stock'];
}

const stockParameter = Object.freeze({
  name: 'stock',
  definition: PARAMETER_DEFINITIONS['stock'],
  get: getstock,
  set: setstock,
  has: hasstock,
  clear: clearstock,
  validate: validatestock,
  describe: describestock,
  defaultValue: defaultstock
});


function getreservedstock(record) {
  return record ? clone(record['reservedStock']) : undefined;
}

function setreservedstock(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reservedStock'] = normalizeField('reservedStock', value);
  return record;
}

function hasreservedstock(record) {
  return Boolean(record && record['reservedStock'] !== undefined && record['reservedStock'] !== null && record['reservedStock'] !== '');
}

function clearreservedstock(record) {
  if (record) delete record['reservedStock'];
  return record;
}

function validatereservedstock(value) {
  const result = validatePayload({ 'reservedStock': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reservedStock');
}

function describereservedstock() {
  return describeParameter('reservedStock');
}

function defaultreservedstock() {
  return createDefaultParameters()['reservedStock'];
}

const reservedstockParameter = Object.freeze({
  name: 'reservedStock',
  definition: PARAMETER_DEFINITIONS['reservedStock'],
  get: getreservedstock,
  set: setreservedstock,
  has: hasreservedstock,
  clear: clearreservedstock,
  validate: validatereservedstock,
  describe: describereservedstock,
  defaultValue: defaultreservedstock
});


function getlowstockthreshold(record) {
  return record ? clone(record['lowStockThreshold']) : undefined;
}

function setlowstockthreshold(record, value) {
  if (!record) throw new TypeError('record is required');
  record['lowStockThreshold'] = normalizeField('lowStockThreshold', value);
  return record;
}

function haslowstockthreshold(record) {
  return Boolean(record && record['lowStockThreshold'] !== undefined && record['lowStockThreshold'] !== null && record['lowStockThreshold'] !== '');
}

function clearlowstockthreshold(record) {
  if (record) delete record['lowStockThreshold'];
  return record;
}

function validatelowstockthreshold(value) {
  const result = validatePayload({ 'lowStockThreshold': value }, { partial: true });
  return result.errors.filter(error => error.field === 'lowStockThreshold');
}

function describelowstockthreshold() {
  return describeParameter('lowStockThreshold');
}

function defaultlowstockthreshold() {
  return createDefaultParameters()['lowStockThreshold'];
}

const lowstockthresholdParameter = Object.freeze({
  name: 'lowStockThreshold',
  definition: PARAMETER_DEFINITIONS['lowStockThreshold'],
  get: getlowstockthreshold,
  set: setlowstockthreshold,
  has: haslowstockthreshold,
  clear: clearlowstockthreshold,
  validate: validatelowstockthreshold,
  describe: describelowstockthreshold,
  defaultValue: defaultlowstockthreshold
});


function getweight(record) {
  return record ? clone(record['weight']) : undefined;
}

function setweight(record, value) {
  if (!record) throw new TypeError('record is required');
  record['weight'] = normalizeField('weight', value);
  return record;
}

function hasweight(record) {
  return Boolean(record && record['weight'] !== undefined && record['weight'] !== null && record['weight'] !== '');
}

function clearweight(record) {
  if (record) delete record['weight'];
  return record;
}

function validateweight(value) {
  const result = validatePayload({ 'weight': value }, { partial: true });
  return result.errors.filter(error => error.field === 'weight');
}

function describeweight() {
  return describeParameter('weight');
}

function defaultweight() {
  return createDefaultParameters()['weight'];
}

const weightParameter = Object.freeze({
  name: 'weight',
  definition: PARAMETER_DEFINITIONS['weight'],
  get: getweight,
  set: setweight,
  has: hasweight,
  clear: clearweight,
  validate: validateweight,
  describe: describeweight,
  defaultValue: defaultweight
});


function getstatus(record) {
  return record ? clone(record['status']) : undefined;
}

function setstatus(record, value) {
  if (!record) throw new TypeError('record is required');
  record['status'] = normalizeField('status', value);
  return record;
}

function hasstatus(record) {
  return Boolean(record && record['status'] !== undefined && record['status'] !== null && record['status'] !== '');
}

function clearstatus(record) {
  if (record) delete record['status'];
  return record;
}

function validatestatus(value) {
  const result = validatePayload({ 'status': value }, { partial: true });
  return result.errors.filter(error => error.field === 'status');
}

function describestatus() {
  return describeParameter('status');
}

function defaultstatus() {
  return createDefaultParameters()['status'];
}

const statusParameter = Object.freeze({
  name: 'status',
  definition: PARAMETER_DEFINITIONS['status'],
  get: getstatus,
  set: setstatus,
  has: hasstatus,
  clear: clearstatus,
  validate: validatestatus,
  describe: describestatus,
  defaultValue: defaultstatus
});


function getcondition(record) {
  return record ? clone(record['condition']) : undefined;
}

function setcondition(record, value) {
  if (!record) throw new TypeError('record is required');
  record['condition'] = normalizeField('condition', value);
  return record;
}

function hascondition(record) {
  return Boolean(record && record['condition'] !== undefined && record['condition'] !== null && record['condition'] !== '');
}

function clearcondition(record) {
  if (record) delete record['condition'];
  return record;
}

function validatecondition(value) {
  const result = validatePayload({ 'condition': value }, { partial: true });
  return result.errors.filter(error => error.field === 'condition');
}

function describecondition() {
  return describeParameter('condition');
}

function defaultcondition() {
  return createDefaultParameters()['condition'];
}

const conditionParameter = Object.freeze({
  name: 'condition',
  definition: PARAMETER_DEFINITIONS['condition'],
  get: getcondition,
  set: setcondition,
  has: hascondition,
  clear: clearcondition,
  validate: validatecondition,
  describe: describecondition,
  defaultValue: defaultcondition
});


function getvisibility(record) {
  return record ? clone(record['visibility']) : undefined;
}

function setvisibility(record, value) {
  if (!record) throw new TypeError('record is required');
  record['visibility'] = normalizeField('visibility', value);
  return record;
}

function hasvisibility(record) {
  return Boolean(record && record['visibility'] !== undefined && record['visibility'] !== null && record['visibility'] !== '');
}

function clearvisibility(record) {
  if (record) delete record['visibility'];
  return record;
}

function validatevisibility(value) {
  const result = validatePayload({ 'visibility': value }, { partial: true });
  return result.errors.filter(error => error.field === 'visibility');
}

function describevisibility() {
  return describeParameter('visibility');
}

function defaultvisibility() {
  return createDefaultParameters()['visibility'];
}

const visibilityParameter = Object.freeze({
  name: 'visibility',
  definition: PARAMETER_DEFINITIONS['visibility'],
  get: getvisibility,
  set: setvisibility,
  has: hasvisibility,
  clear: clearvisibility,
  validate: validatevisibility,
  describe: describevisibility,
  defaultValue: defaultvisibility
});


function gettaxclass(record) {
  return record ? clone(record['taxClass']) : undefined;
}

function settaxclass(record, value) {
  if (!record) throw new TypeError('record is required');
  record['taxClass'] = normalizeField('taxClass', value);
  return record;
}

function hastaxclass(record) {
  return Boolean(record && record['taxClass'] !== undefined && record['taxClass'] !== null && record['taxClass'] !== '');
}

function cleartaxclass(record) {
  if (record) delete record['taxClass'];
  return record;
}

function validatetaxclass(value) {
  const result = validatePayload({ 'taxClass': value }, { partial: true });
  return result.errors.filter(error => error.field === 'taxClass');
}

function describetaxclass() {
  return describeParameter('taxClass');
}

function defaulttaxclass() {
  return createDefaultParameters()['taxClass'];
}

const taxclassParameter = Object.freeze({
  name: 'taxClass',
  definition: PARAMETER_DEFINITIONS['taxClass'],
  get: gettaxclass,
  set: settaxclass,
  has: hastaxclass,
  clear: cleartaxclass,
  validate: validatetaxclass,
  describe: describetaxclass,
  defaultValue: defaulttaxclass
});


function getcreatedat(record) {
  return record ? clone(record['createdAt']) : undefined;
}

function setcreatedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['createdAt'] = normalizeField('createdAt', value);
  return record;
}

function hascreatedat(record) {
  return Boolean(record && record['createdAt'] !== undefined && record['createdAt'] !== null && record['createdAt'] !== '');
}

function clearcreatedat(record) {
  if (record) delete record['createdAt'];
  return record;
}

function validatecreatedat(value) {
  const result = validatePayload({ 'createdAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'createdAt');
}

function describecreatedat() {
  return describeParameter('createdAt');
}

function defaultcreatedat() {
  return createDefaultParameters()['createdAt'];
}

const createdatParameter = Object.freeze({
  name: 'createdAt',
  definition: PARAMETER_DEFINITIONS['createdAt'],
  get: getcreatedat,
  set: setcreatedat,
  has: hascreatedat,
  clear: clearcreatedat,
  validate: validatecreatedat,
  describe: describecreatedat,
  defaultValue: defaultcreatedat
});


function getupdatedat(record) {
  return record ? clone(record['updatedAt']) : undefined;
}

function setupdatedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['updatedAt'] = normalizeField('updatedAt', value);
  return record;
}

function hasupdatedat(record) {
  return Boolean(record && record['updatedAt'] !== undefined && record['updatedAt'] !== null && record['updatedAt'] !== '');
}

function clearupdatedat(record) {
  if (record) delete record['updatedAt'];
  return record;
}

function validateupdatedat(value) {
  const result = validatePayload({ 'updatedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'updatedAt');
}

function describeupdatedat() {
  return describeParameter('updatedAt');
}

function defaultupdatedat() {
  return createDefaultParameters()['updatedAt'];
}

const updatedatParameter = Object.freeze({
  name: 'updatedAt',
  definition: PARAMETER_DEFINITIONS['updatedAt'],
  get: getupdatedat,
  set: setupdatedat,
  has: hasupdatedat,
  clear: clearupdatedat,
  validate: validateupdatedat,
  describe: describeupdatedat,
  defaultValue: defaultupdatedat
});


const PARAMETERS = Object.freeze({
  id: idParameter,
  sellerid: selleridParameter,
  categoryid: categoryidParameter,
  sku: skuParameter,
  title: titleParameter,
  slug: slugParameter,
  description: descriptionParameter,
  brand: brandParameter,
  price: priceParameter,
  compareat: compareatParameter,
  costprice: costpriceParameter,
  currency: currencyParameter,
  stock: stockParameter,
  reservedstock: reservedstockParameter,
  lowstockthreshold: lowstockthresholdParameter,
  weight: weightParameter,
  status: statusParameter,
  condition: conditionParameter,
  visibility: visibilityParameter,
  taxclass: taxclassParameter,
  createdat: createdatParameter,
  updatedat: updatedatParameter,
});

module.exports = {
  MODULE_NAME,
  VERSION,
  FIELD_NAMES,
  PARAMETER_DEFINITIONS,
  DomainRepository,
  normalizePayload,
  validatePayload,
  normalizeField,
  matches,
  project,
  sortRecords,
  paginate,
  createDefaultParameters,
  describeParameter,
  listParameters,
  PARAMETERS
};
function parameterPolicy_0(input = {}) {
  const value = normalizeField('id', input['id']);
  const definition = PARAMETER_DEFINITIONS['id'];
  return {
    field: 'id',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'id' : 'id')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_1(input = {}) {
  const value = normalizeField('sellerId', input['sellerId']);
  const definition = PARAMETER_DEFINITIONS['sellerId'];
  return {
    field: 'sellerId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'sellerId' : 'sellerId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
  const value = normalizeField('categoryId', input['categoryId']);
  const definition = PARAMETER_DEFINITIONS['categoryId'];
  return {
    field: 'categoryId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'categoryId' : 'categoryId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('sku', input['sku']);
  const definition = PARAMETER_DEFINITIONS['sku'];
  return {
    field: 'sku',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'sku' : 'sku')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('title', input['title']);
  const definition = PARAMETER_DEFINITIONS['title'];
  return {
    field: 'title',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'title' : 'title')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('slug', input['slug']);
  const definition = PARAMETER_DEFINITIONS['slug'];
  return {
    field: 'slug',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'slug' : 'slug')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('description', input['description']);
  const definition = PARAMETER_DEFINITIONS['description'];
  return {
    field: 'description',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'description' : 'description')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('brand', input['brand']);
  const definition = PARAMETER_DEFINITIONS['brand'];
  return {
    field: 'brand',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'brand' : 'brand')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('price', input['price']);
  const definition = PARAMETER_DEFINITIONS['price'];
  return {
    field: 'price',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'price' : 'price')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('compareAt', input['compareAt']);
  const definition = PARAMETER_DEFINITIONS['compareAt'];
  return {
    field: 'compareAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'compareAt' : 'compareAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('costPrice', input['costPrice']);
  const definition = PARAMETER_DEFINITIONS['costPrice'];
  return {
    field: 'costPrice',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'costPrice' : 'costPrice')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('currency', input['currency']);
  const definition = PARAMETER_DEFINITIONS['currency'];
  return {
    field: 'currency',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'currency' : 'currency')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
  const value = normalizeField('stock', input['stock']);
  const definition = PARAMETER_DEFINITIONS['stock'];
  return {
    field: 'stock',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'stock' : 'stock')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_13(input = {}) {
  const value = normalizeField('reservedStock', input['reservedStock']);
  const definition = PARAMETER_DEFINITIONS['reservedStock'];
  return {
    field: 'reservedStock',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reservedStock' : 'reservedStock')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_14(input = {}) {
  const value = normalizeField('lowStockThreshold', input['lowStockThreshold']);
  const definition = PARAMETER_DEFINITIONS['lowStockThreshold'];
  return {
    field: 'lowStockThreshold',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'lowStockThreshold' : 'lowStockThreshold')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_15(input = {}) {
  const value = normalizeField('weight', input['weight']);
  const definition = PARAMETER_DEFINITIONS['weight'];
  return {
    field: 'weight',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'weight' : 'weight')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_16(input = {}) {
  const value = normalizeField('status', input['status']);
  const definition = PARAMETER_DEFINITIONS['status'];
  return {
    field: 'status',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'status' : 'status')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_17(input = {}) {
  const value = normalizeField('condition', input['condition']);
  const definition = PARAMETER_DEFINITIONS['condition'];
  return {
    field: 'condition',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'condition' : 'condition')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_18(input = {}) {
  const value = normalizeField('visibility', input['visibility']);
  const definition = PARAMETER_DEFINITIONS['visibility'];
  return {
    field: 'visibility',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'visibility' : 'visibility')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_19(input = {}) {
  const value = normalizeField('taxClass', input['taxClass']);
  const definition = PARAMETER_DEFINITIONS['taxClass'];
  return {
    field: 'taxClass',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'taxClass' : 'taxClass')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_20(input = {}) {
  const value = normalizeField('createdAt', input['createdAt']);
  const definition = PARAMETER_DEFINITIONS['createdAt'];
  return {
    field: 'createdAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'createdAt' : 'createdAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_21(input = {}) {
  const value = normalizeField('updatedAt', input['updatedAt']);
  const definition = PARAMETER_DEFINITIONS['updatedAt'];
  return {
    field: 'updatedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'updatedAt' : 'updatedAt')]: value }, { partial: true }).valid
  };
}

for (const [index, field] of FIELD_NAMES.entries()) {
  module.exports[`parameterPolicy_${index}`] = input => {
    const definition = PARAMETER_DEFINITIONS[field];
    const value = normalizeField(field, input ? input[field] : undefined);
    return { field, value, type: definition.type, required: definition.required, nullable: definition.nullable };
  };
}
