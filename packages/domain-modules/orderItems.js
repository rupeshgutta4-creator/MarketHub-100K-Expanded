
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'orderItems';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'orderId', 'sellerId', 'productId', 'variantId', 'sku', 'title', 'unitPrice', 'quantity', 'discount', 'tax', 'lineTotal', 'status', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sellerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'variantId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'sku': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'title': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'unitPrice': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'quantity': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'discount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'tax': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'lineTotal': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getorderid(record) {
  return record ? clone(record['orderId']) : undefined;
}

function setorderid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['orderId'] = normalizeField('orderId', value);
  return record;
}

function hasorderid(record) {
  return Boolean(record && record['orderId'] !== undefined && record['orderId'] !== null && record['orderId'] !== '');
}

function clearorderid(record) {
  if (record) delete record['orderId'];
  return record;
}

function validateorderid(value) {
  const result = validatePayload({ 'orderId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'orderId');
}

function describeorderid() {
  return describeParameter('orderId');
}

function defaultorderid() {
  return createDefaultParameters()['orderId'];
}

const orderidParameter = Object.freeze({
  name: 'orderId',
  definition: PARAMETER_DEFINITIONS['orderId'],
  get: getorderid,
  set: setorderid,
  has: hasorderid,
  clear: clearorderid,
  validate: validateorderid,
  describe: describeorderid,
  defaultValue: defaultorderid
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


function getproductid(record) {
  return record ? clone(record['productId']) : undefined;
}

function setproductid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['productId'] = normalizeField('productId', value);
  return record;
}

function hasproductid(record) {
  return Boolean(record && record['productId'] !== undefined && record['productId'] !== null && record['productId'] !== '');
}

function clearproductid(record) {
  if (record) delete record['productId'];
  return record;
}

function validateproductid(value) {
  const result = validatePayload({ 'productId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'productId');
}

function describeproductid() {
  return describeParameter('productId');
}

function defaultproductid() {
  return createDefaultParameters()['productId'];
}

const productidParameter = Object.freeze({
  name: 'productId',
  definition: PARAMETER_DEFINITIONS['productId'],
  get: getproductid,
  set: setproductid,
  has: hasproductid,
  clear: clearproductid,
  validate: validateproductid,
  describe: describeproductid,
  defaultValue: defaultproductid
});


function getvariantid(record) {
  return record ? clone(record['variantId']) : undefined;
}

function setvariantid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['variantId'] = normalizeField('variantId', value);
  return record;
}

function hasvariantid(record) {
  return Boolean(record && record['variantId'] !== undefined && record['variantId'] !== null && record['variantId'] !== '');
}

function clearvariantid(record) {
  if (record) delete record['variantId'];
  return record;
}

function validatevariantid(value) {
  const result = validatePayload({ 'variantId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'variantId');
}

function describevariantid() {
  return describeParameter('variantId');
}

function defaultvariantid() {
  return createDefaultParameters()['variantId'];
}

const variantidParameter = Object.freeze({
  name: 'variantId',
  definition: PARAMETER_DEFINITIONS['variantId'],
  get: getvariantid,
  set: setvariantid,
  has: hasvariantid,
  clear: clearvariantid,
  validate: validatevariantid,
  describe: describevariantid,
  defaultValue: defaultvariantid
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


function getunitprice(record) {
  return record ? clone(record['unitPrice']) : undefined;
}

function setunitprice(record, value) {
  if (!record) throw new TypeError('record is required');
  record['unitPrice'] = normalizeField('unitPrice', value);
  return record;
}

function hasunitprice(record) {
  return Boolean(record && record['unitPrice'] !== undefined && record['unitPrice'] !== null && record['unitPrice'] !== '');
}

function clearunitprice(record) {
  if (record) delete record['unitPrice'];
  return record;
}

function validateunitprice(value) {
  const result = validatePayload({ 'unitPrice': value }, { partial: true });
  return result.errors.filter(error => error.field === 'unitPrice');
}

function describeunitprice() {
  return describeParameter('unitPrice');
}

function defaultunitprice() {
  return createDefaultParameters()['unitPrice'];
}

const unitpriceParameter = Object.freeze({
  name: 'unitPrice',
  definition: PARAMETER_DEFINITIONS['unitPrice'],
  get: getunitprice,
  set: setunitprice,
  has: hasunitprice,
  clear: clearunitprice,
  validate: validateunitprice,
  describe: describeunitprice,
  defaultValue: defaultunitprice
});


function getquantity(record) {
  return record ? clone(record['quantity']) : undefined;
}

function setquantity(record, value) {
  if (!record) throw new TypeError('record is required');
  record['quantity'] = normalizeField('quantity', value);
  return record;
}

function hasquantity(record) {
  return Boolean(record && record['quantity'] !== undefined && record['quantity'] !== null && record['quantity'] !== '');
}

function clearquantity(record) {
  if (record) delete record['quantity'];
  return record;
}

function validatequantity(value) {
  const result = validatePayload({ 'quantity': value }, { partial: true });
  return result.errors.filter(error => error.field === 'quantity');
}

function describequantity() {
  return describeParameter('quantity');
}

function defaultquantity() {
  return createDefaultParameters()['quantity'];
}

const quantityParameter = Object.freeze({
  name: 'quantity',
  definition: PARAMETER_DEFINITIONS['quantity'],
  get: getquantity,
  set: setquantity,
  has: hasquantity,
  clear: clearquantity,
  validate: validatequantity,
  describe: describequantity,
  defaultValue: defaultquantity
});


function getdiscount(record) {
  return record ? clone(record['discount']) : undefined;
}

function setdiscount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['discount'] = normalizeField('discount', value);
  return record;
}

function hasdiscount(record) {
  return Boolean(record && record['discount'] !== undefined && record['discount'] !== null && record['discount'] !== '');
}

function cleardiscount(record) {
  if (record) delete record['discount'];
  return record;
}

function validatediscount(value) {
  const result = validatePayload({ 'discount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'discount');
}

function describediscount() {
  return describeParameter('discount');
}

function defaultdiscount() {
  return createDefaultParameters()['discount'];
}

const discountParameter = Object.freeze({
  name: 'discount',
  definition: PARAMETER_DEFINITIONS['discount'],
  get: getdiscount,
  set: setdiscount,
  has: hasdiscount,
  clear: cleardiscount,
  validate: validatediscount,
  describe: describediscount,
  defaultValue: defaultdiscount
});


function gettax(record) {
  return record ? clone(record['tax']) : undefined;
}

function settax(record, value) {
  if (!record) throw new TypeError('record is required');
  record['tax'] = normalizeField('tax', value);
  return record;
}

function hastax(record) {
  return Boolean(record && record['tax'] !== undefined && record['tax'] !== null && record['tax'] !== '');
}

function cleartax(record) {
  if (record) delete record['tax'];
  return record;
}

function validatetax(value) {
  const result = validatePayload({ 'tax': value }, { partial: true });
  return result.errors.filter(error => error.field === 'tax');
}

function describetax() {
  return describeParameter('tax');
}

function defaulttax() {
  return createDefaultParameters()['tax'];
}

const taxParameter = Object.freeze({
  name: 'tax',
  definition: PARAMETER_DEFINITIONS['tax'],
  get: gettax,
  set: settax,
  has: hastax,
  clear: cleartax,
  validate: validatetax,
  describe: describetax,
  defaultValue: defaulttax
});


function getlinetotal(record) {
  return record ? clone(record['lineTotal']) : undefined;
}

function setlinetotal(record, value) {
  if (!record) throw new TypeError('record is required');
  record['lineTotal'] = normalizeField('lineTotal', value);
  return record;
}

function haslinetotal(record) {
  return Boolean(record && record['lineTotal'] !== undefined && record['lineTotal'] !== null && record['lineTotal'] !== '');
}

function clearlinetotal(record) {
  if (record) delete record['lineTotal'];
  return record;
}

function validatelinetotal(value) {
  const result = validatePayload({ 'lineTotal': value }, { partial: true });
  return result.errors.filter(error => error.field === 'lineTotal');
}

function describelinetotal() {
  return describeParameter('lineTotal');
}

function defaultlinetotal() {
  return createDefaultParameters()['lineTotal'];
}

const linetotalParameter = Object.freeze({
  name: 'lineTotal',
  definition: PARAMETER_DEFINITIONS['lineTotal'],
  get: getlinetotal,
  set: setlinetotal,
  has: haslinetotal,
  clear: clearlinetotal,
  validate: validatelinetotal,
  describe: describelinetotal,
  defaultValue: defaultlinetotal
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
  orderid: orderidParameter,
  sellerid: selleridParameter,
  productid: productidParameter,
  variantid: variantidParameter,
  sku: skuParameter,
  title: titleParameter,
  unitprice: unitpriceParameter,
  quantity: quantityParameter,
  discount: discountParameter,
  tax: taxParameter,
  linetotal: linetotalParameter,
  status: statusParameter,
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
  const value = normalizeField('orderId', input['orderId']);
  const definition = PARAMETER_DEFINITIONS['orderId'];
  return {
    field: 'orderId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'orderId' : 'orderId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
  const value = normalizeField('productId', input['productId']);
  const definition = PARAMETER_DEFINITIONS['productId'];
  return {
    field: 'productId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'productId' : 'productId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('variantId', input['variantId']);
  const definition = PARAMETER_DEFINITIONS['variantId'];
  return {
    field: 'variantId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'variantId' : 'variantId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
  const value = normalizeField('unitPrice', input['unitPrice']);
  const definition = PARAMETER_DEFINITIONS['unitPrice'];
  return {
    field: 'unitPrice',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'unitPrice' : 'unitPrice')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('quantity', input['quantity']);
  const definition = PARAMETER_DEFINITIONS['quantity'];
  return {
    field: 'quantity',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'quantity' : 'quantity')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('discount', input['discount']);
  const definition = PARAMETER_DEFINITIONS['discount'];
  return {
    field: 'discount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'discount' : 'discount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('tax', input['tax']);
  const definition = PARAMETER_DEFINITIONS['tax'];
  return {
    field: 'tax',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'tax' : 'tax')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('lineTotal', input['lineTotal']);
  const definition = PARAMETER_DEFINITIONS['lineTotal'];
  return {
    field: 'lineTotal',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'lineTotal' : 'lineTotal')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
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

function parameterPolicy_13(input = {}) {
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

function parameterPolicy_14(input = {}) {
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
