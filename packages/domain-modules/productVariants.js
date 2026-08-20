
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'productVariants';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'productId', 'sku', 'name', 'optionValues', 'price', 'compareAt', 'costPrice', 'stock', 'weight', 'barcode', 'imageUrl', 'status', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sku': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'name': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'optionValues': Object.freeze({'type': 'array', 'required': false, 'nullable': true}),
  'price': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'compareAt': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'costPrice': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'stock': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'weight': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'barcode': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'imageUrl': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getname(record) {
  return record ? clone(record['name']) : undefined;
}

function setname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['name'] = normalizeField('name', value);
  return record;
}

function hasname(record) {
  return Boolean(record && record['name'] !== undefined && record['name'] !== null && record['name'] !== '');
}

function clearname(record) {
  if (record) delete record['name'];
  return record;
}

function validatename(value) {
  const result = validatePayload({ 'name': value }, { partial: true });
  return result.errors.filter(error => error.field === 'name');
}

function describename() {
  return describeParameter('name');
}

function defaultname() {
  return createDefaultParameters()['name'];
}

const nameParameter = Object.freeze({
  name: 'name',
  definition: PARAMETER_DEFINITIONS['name'],
  get: getname,
  set: setname,
  has: hasname,
  clear: clearname,
  validate: validatename,
  describe: describename,
  defaultValue: defaultname
});


function getoptionvalues(record) {
  return record ? clone(record['optionValues']) : undefined;
}

function setoptionvalues(record, value) {
  if (!record) throw new TypeError('record is required');
  record['optionValues'] = normalizeField('optionValues', value);
  return record;
}

function hasoptionvalues(record) {
  return Boolean(record && record['optionValues'] !== undefined && record['optionValues'] !== null && record['optionValues'] !== '');
}

function clearoptionvalues(record) {
  if (record) delete record['optionValues'];
  return record;
}

function validateoptionvalues(value) {
  const result = validatePayload({ 'optionValues': value }, { partial: true });
  return result.errors.filter(error => error.field === 'optionValues');
}

function describeoptionvalues() {
  return describeParameter('optionValues');
}

function defaultoptionvalues() {
  return createDefaultParameters()['optionValues'];
}

const optionvaluesParameter = Object.freeze({
  name: 'optionValues',
  definition: PARAMETER_DEFINITIONS['optionValues'],
  get: getoptionvalues,
  set: setoptionvalues,
  has: hasoptionvalues,
  clear: clearoptionvalues,
  validate: validateoptionvalues,
  describe: describeoptionvalues,
  defaultValue: defaultoptionvalues
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


function getbarcode(record) {
  return record ? clone(record['barcode']) : undefined;
}

function setbarcode(record, value) {
  if (!record) throw new TypeError('record is required');
  record['barcode'] = normalizeField('barcode', value);
  return record;
}

function hasbarcode(record) {
  return Boolean(record && record['barcode'] !== undefined && record['barcode'] !== null && record['barcode'] !== '');
}

function clearbarcode(record) {
  if (record) delete record['barcode'];
  return record;
}

function validatebarcode(value) {
  const result = validatePayload({ 'barcode': value }, { partial: true });
  return result.errors.filter(error => error.field === 'barcode');
}

function describebarcode() {
  return describeParameter('barcode');
}

function defaultbarcode() {
  return createDefaultParameters()['barcode'];
}

const barcodeParameter = Object.freeze({
  name: 'barcode',
  definition: PARAMETER_DEFINITIONS['barcode'],
  get: getbarcode,
  set: setbarcode,
  has: hasbarcode,
  clear: clearbarcode,
  validate: validatebarcode,
  describe: describebarcode,
  defaultValue: defaultbarcode
});


function getimageurl(record) {
  return record ? clone(record['imageUrl']) : undefined;
}

function setimageurl(record, value) {
  if (!record) throw new TypeError('record is required');
  record['imageUrl'] = normalizeField('imageUrl', value);
  return record;
}

function hasimageurl(record) {
  return Boolean(record && record['imageUrl'] !== undefined && record['imageUrl'] !== null && record['imageUrl'] !== '');
}

function clearimageurl(record) {
  if (record) delete record['imageUrl'];
  return record;
}

function validateimageurl(value) {
  const result = validatePayload({ 'imageUrl': value }, { partial: true });
  return result.errors.filter(error => error.field === 'imageUrl');
}

function describeimageurl() {
  return describeParameter('imageUrl');
}

function defaultimageurl() {
  return createDefaultParameters()['imageUrl'];
}

const imageurlParameter = Object.freeze({
  name: 'imageUrl',
  definition: PARAMETER_DEFINITIONS['imageUrl'],
  get: getimageurl,
  set: setimageurl,
  has: hasimageurl,
  clear: clearimageurl,
  validate: validateimageurl,
  describe: describeimageurl,
  defaultValue: defaultimageurl
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
  productid: productidParameter,
  sku: skuParameter,
  name: nameParameter,
  optionvalues: optionvaluesParameter,
  price: priceParameter,
  compareat: compareatParameter,
  costprice: costpriceParameter,
  stock: stockParameter,
  weight: weightParameter,
  barcode: barcodeParameter,
  imageurl: imageurlParameter,
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

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
  const value = normalizeField('name', input['name']);
  const definition = PARAMETER_DEFINITIONS['name'];
  return {
    field: 'name',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'name' : 'name')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('optionValues', input['optionValues']);
  const definition = PARAMETER_DEFINITIONS['optionValues'];
  return {
    field: 'optionValues',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'optionValues' : 'optionValues')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
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

function parameterPolicy_8(input = {}) {
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

function parameterPolicy_9(input = {}) {
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

function parameterPolicy_10(input = {}) {
  const value = normalizeField('barcode', input['barcode']);
  const definition = PARAMETER_DEFINITIONS['barcode'];
  return {
    field: 'barcode',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'barcode' : 'barcode')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('imageUrl', input['imageUrl']);
  const definition = PARAMETER_DEFINITIONS['imageUrl'];
  return {
    field: 'imageUrl',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'imageUrl' : 'imageUrl')]: value }, { partial: true }).valid
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
