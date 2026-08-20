
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'carts';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'buyerId', 'currency', 'couponCode', 'subtotal', 'discount', 'shipping', 'tax', 'total', 'status', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'buyerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'currency': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'couponCode': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'subtotal': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'discount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'shipping': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'tax': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'total': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
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


function getbuyerid(record) {
  return record ? clone(record['buyerId']) : undefined;
}

function setbuyerid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['buyerId'] = normalizeField('buyerId', value);
  return record;
}

function hasbuyerid(record) {
  return Boolean(record && record['buyerId'] !== undefined && record['buyerId'] !== null && record['buyerId'] !== '');
}

function clearbuyerid(record) {
  if (record) delete record['buyerId'];
  return record;
}

function validatebuyerid(value) {
  const result = validatePayload({ 'buyerId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'buyerId');
}

function describebuyerid() {
  return describeParameter('buyerId');
}

function defaultbuyerid() {
  return createDefaultParameters()['buyerId'];
}

const buyeridParameter = Object.freeze({
  name: 'buyerId',
  definition: PARAMETER_DEFINITIONS['buyerId'],
  get: getbuyerid,
  set: setbuyerid,
  has: hasbuyerid,
  clear: clearbuyerid,
  validate: validatebuyerid,
  describe: describebuyerid,
  defaultValue: defaultbuyerid
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


function getcouponcode(record) {
  return record ? clone(record['couponCode']) : undefined;
}

function setcouponcode(record, value) {
  if (!record) throw new TypeError('record is required');
  record['couponCode'] = normalizeField('couponCode', value);
  return record;
}

function hascouponcode(record) {
  return Boolean(record && record['couponCode'] !== undefined && record['couponCode'] !== null && record['couponCode'] !== '');
}

function clearcouponcode(record) {
  if (record) delete record['couponCode'];
  return record;
}

function validatecouponcode(value) {
  const result = validatePayload({ 'couponCode': value }, { partial: true });
  return result.errors.filter(error => error.field === 'couponCode');
}

function describecouponcode() {
  return describeParameter('couponCode');
}

function defaultcouponcode() {
  return createDefaultParameters()['couponCode'];
}

const couponcodeParameter = Object.freeze({
  name: 'couponCode',
  definition: PARAMETER_DEFINITIONS['couponCode'],
  get: getcouponcode,
  set: setcouponcode,
  has: hascouponcode,
  clear: clearcouponcode,
  validate: validatecouponcode,
  describe: describecouponcode,
  defaultValue: defaultcouponcode
});


function getsubtotal(record) {
  return record ? clone(record['subtotal']) : undefined;
}

function setsubtotal(record, value) {
  if (!record) throw new TypeError('record is required');
  record['subtotal'] = normalizeField('subtotal', value);
  return record;
}

function hassubtotal(record) {
  return Boolean(record && record['subtotal'] !== undefined && record['subtotal'] !== null && record['subtotal'] !== '');
}

function clearsubtotal(record) {
  if (record) delete record['subtotal'];
  return record;
}

function validatesubtotal(value) {
  const result = validatePayload({ 'subtotal': value }, { partial: true });
  return result.errors.filter(error => error.field === 'subtotal');
}

function describesubtotal() {
  return describeParameter('subtotal');
}

function defaultsubtotal() {
  return createDefaultParameters()['subtotal'];
}

const subtotalParameter = Object.freeze({
  name: 'subtotal',
  definition: PARAMETER_DEFINITIONS['subtotal'],
  get: getsubtotal,
  set: setsubtotal,
  has: hassubtotal,
  clear: clearsubtotal,
  validate: validatesubtotal,
  describe: describesubtotal,
  defaultValue: defaultsubtotal
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


function getshipping(record) {
  return record ? clone(record['shipping']) : undefined;
}

function setshipping(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shipping'] = normalizeField('shipping', value);
  return record;
}

function hasshipping(record) {
  return Boolean(record && record['shipping'] !== undefined && record['shipping'] !== null && record['shipping'] !== '');
}

function clearshipping(record) {
  if (record) delete record['shipping'];
  return record;
}

function validateshipping(value) {
  const result = validatePayload({ 'shipping': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shipping');
}

function describeshipping() {
  return describeParameter('shipping');
}

function defaultshipping() {
  return createDefaultParameters()['shipping'];
}

const shippingParameter = Object.freeze({
  name: 'shipping',
  definition: PARAMETER_DEFINITIONS['shipping'],
  get: getshipping,
  set: setshipping,
  has: hasshipping,
  clear: clearshipping,
  validate: validateshipping,
  describe: describeshipping,
  defaultValue: defaultshipping
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


function gettotal(record) {
  return record ? clone(record['total']) : undefined;
}

function settotal(record, value) {
  if (!record) throw new TypeError('record is required');
  record['total'] = normalizeField('total', value);
  return record;
}

function hastotal(record) {
  return Boolean(record && record['total'] !== undefined && record['total'] !== null && record['total'] !== '');
}

function cleartotal(record) {
  if (record) delete record['total'];
  return record;
}

function validatetotal(value) {
  const result = validatePayload({ 'total': value }, { partial: true });
  return result.errors.filter(error => error.field === 'total');
}

function describetotal() {
  return describeParameter('total');
}

function defaulttotal() {
  return createDefaultParameters()['total'];
}

const totalParameter = Object.freeze({
  name: 'total',
  definition: PARAMETER_DEFINITIONS['total'],
  get: gettotal,
  set: settotal,
  has: hastotal,
  clear: cleartotal,
  validate: validatetotal,
  describe: describetotal,
  defaultValue: defaulttotal
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
  buyerid: buyeridParameter,
  currency: currencyParameter,
  couponcode: couponcodeParameter,
  subtotal: subtotalParameter,
  discount: discountParameter,
  shipping: shippingParameter,
  tax: taxParameter,
  total: totalParameter,
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
  const value = normalizeField('buyerId', input['buyerId']);
  const definition = PARAMETER_DEFINITIONS['buyerId'];
  return {
    field: 'buyerId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'buyerId' : 'buyerId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
  const value = normalizeField('couponCode', input['couponCode']);
  const definition = PARAMETER_DEFINITIONS['couponCode'];
  return {
    field: 'couponCode',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'couponCode' : 'couponCode')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('subtotal', input['subtotal']);
  const definition = PARAMETER_DEFINITIONS['subtotal'];
  return {
    field: 'subtotal',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'subtotal' : 'subtotal')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
  const value = normalizeField('shipping', input['shipping']);
  const definition = PARAMETER_DEFINITIONS['shipping'];
  return {
    field: 'shipping',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shipping' : 'shipping')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
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

function parameterPolicy_8(input = {}) {
  const value = normalizeField('total', input['total']);
  const definition = PARAMETER_DEFINITIONS['total'];
  return {
    field: 'total',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'total' : 'total')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
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

function parameterPolicy_10(input = {}) {
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

function parameterPolicy_11(input = {}) {
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
