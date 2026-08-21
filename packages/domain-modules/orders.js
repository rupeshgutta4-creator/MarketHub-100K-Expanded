
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'orders';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'number', 'buyerId', 'currency', 'subtotal', 'discount', 'shipping', 'tax', 'total', 'status', 'paymentStatus', 'fulfillmentStatus', 'shippingAddress', 'billingAddress', 'placedAt', 'confirmedAt', 'shippedAt', 'deliveredAt', 'cancelledAt', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'number': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'buyerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'currency': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'subtotal': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'discount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'shipping': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'tax': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'total': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'paymentStatus': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'fulfillmentStatus': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'shippingAddress': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'billingAddress': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'placedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'confirmedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'shippedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'deliveredAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'cancelledAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getnumber(record) {
  return record ? clone(record['number']) : undefined;
}

function setnumber(record, value) {
  if (!record) throw new TypeError('record is required');
  record['number'] = normalizeField('number', value);
  return record;
}

function hasnumber(record) {
  return Boolean(record && record['number'] !== undefined && record['number'] !== null && record['number'] !== '');
}

function clearnumber(record) {
  if (record) delete record['number'];
  return record;
}

function validatenumber(value) {
  const result = validatePayload({ 'number': value }, { partial: true });
  return result.errors.filter(error => error.field === 'number');
}

function describenumber() {
  return describeParameter('number');
}

function defaultnumber() {
  return createDefaultParameters()['number'];
}

const numberParameter = Object.freeze({
  name: 'number',
  definition: PARAMETER_DEFINITIONS['number'],
  get: getnumber,
  set: setnumber,
  has: hasnumber,
  clear: clearnumber,
  validate: validatenumber,
  describe: describenumber,
  defaultValue: defaultnumber
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


function getpaymentstatus(record) {
  return record ? clone(record['paymentStatus']) : undefined;
}

function setpaymentstatus(record, value) {
  if (!record) throw new TypeError('record is required');
  record['paymentStatus'] = normalizeField('paymentStatus', value);
  return record;
}

function haspaymentstatus(record) {
  return Boolean(record && record['paymentStatus'] !== undefined && record['paymentStatus'] !== null && record['paymentStatus'] !== '');
}

function clearpaymentstatus(record) {
  if (record) delete record['paymentStatus'];
  return record;
}

function validatepaymentstatus(value) {
  const result = validatePayload({ 'paymentStatus': value }, { partial: true });
  return result.errors.filter(error => error.field === 'paymentStatus');
}

function describepaymentstatus() {
  return describeParameter('paymentStatus');
}

function defaultpaymentstatus() {
  return createDefaultParameters()['paymentStatus'];
}

const paymentstatusParameter = Object.freeze({
  name: 'paymentStatus',
  definition: PARAMETER_DEFINITIONS['paymentStatus'],
  get: getpaymentstatus,
  set: setpaymentstatus,
  has: haspaymentstatus,
  clear: clearpaymentstatus,
  validate: validatepaymentstatus,
  describe: describepaymentstatus,
  defaultValue: defaultpaymentstatus
});


function getfulfillmentstatus(record) {
  return record ? clone(record['fulfillmentStatus']) : undefined;
}

function setfulfillmentstatus(record, value) {
  if (!record) throw new TypeError('record is required');
  record['fulfillmentStatus'] = normalizeField('fulfillmentStatus', value);
  return record;
}

function hasfulfillmentstatus(record) {
  return Boolean(record && record['fulfillmentStatus'] !== undefined && record['fulfillmentStatus'] !== null && record['fulfillmentStatus'] !== '');
}

function clearfulfillmentstatus(record) {
  if (record) delete record['fulfillmentStatus'];
  return record;
}

function validatefulfillmentstatus(value) {
  const result = validatePayload({ 'fulfillmentStatus': value }, { partial: true });
  return result.errors.filter(error => error.field === 'fulfillmentStatus');
}

function describefulfillmentstatus() {
  return describeParameter('fulfillmentStatus');
}

function defaultfulfillmentstatus() {
  return createDefaultParameters()['fulfillmentStatus'];
}

const fulfillmentstatusParameter = Object.freeze({
  name: 'fulfillmentStatus',
  definition: PARAMETER_DEFINITIONS['fulfillmentStatus'],
  get: getfulfillmentstatus,
  set: setfulfillmentstatus,
  has: hasfulfillmentstatus,
  clear: clearfulfillmentstatus,
  validate: validatefulfillmentstatus,
  describe: describefulfillmentstatus,
  defaultValue: defaultfulfillmentstatus
});


function getshippingaddress(record) {
  return record ? clone(record['shippingAddress']) : undefined;
}

function setshippingaddress(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shippingAddress'] = normalizeField('shippingAddress', value);
  return record;
}

function hasshippingaddress(record) {
  return Boolean(record && record['shippingAddress'] !== undefined && record['shippingAddress'] !== null && record['shippingAddress'] !== '');
}

function clearshippingaddress(record) {
  if (record) delete record['shippingAddress'];
  return record;
}

function validateshippingaddress(value) {
  const result = validatePayload({ 'shippingAddress': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shippingAddress');
}

function describeshippingaddress() {
  return describeParameter('shippingAddress');
}

function defaultshippingaddress() {
  return createDefaultParameters()['shippingAddress'];
}

const shippingaddressParameter = Object.freeze({
  name: 'shippingAddress',
  definition: PARAMETER_DEFINITIONS['shippingAddress'],
  get: getshippingaddress,
  set: setshippingaddress,
  has: hasshippingaddress,
  clear: clearshippingaddress,
  validate: validateshippingaddress,
  describe: describeshippingaddress,
  defaultValue: defaultshippingaddress
});


function getbillingaddress(record) {
  return record ? clone(record['billingAddress']) : undefined;
}

function setbillingaddress(record, value) {
  if (!record) throw new TypeError('record is required');
  record['billingAddress'] = normalizeField('billingAddress', value);
  return record;
}

function hasbillingaddress(record) {
  return Boolean(record && record['billingAddress'] !== undefined && record['billingAddress'] !== null && record['billingAddress'] !== '');
}

function clearbillingaddress(record) {
  if (record) delete record['billingAddress'];
  return record;
}

function validatebillingaddress(value) {
  const result = validatePayload({ 'billingAddress': value }, { partial: true });
  return result.errors.filter(error => error.field === 'billingAddress');
}

function describebillingaddress() {
  return describeParameter('billingAddress');
}

function defaultbillingaddress() {
  return createDefaultParameters()['billingAddress'];
}

const billingaddressParameter = Object.freeze({
  name: 'billingAddress',
  definition: PARAMETER_DEFINITIONS['billingAddress'],
  get: getbillingaddress,
  set: setbillingaddress,
  has: hasbillingaddress,
  clear: clearbillingaddress,
  validate: validatebillingaddress,
  describe: describebillingaddress,
  defaultValue: defaultbillingaddress
});


function getplacedat(record) {
  return record ? clone(record['placedAt']) : undefined;
}

function setplacedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['placedAt'] = normalizeField('placedAt', value);
  return record;
}

function hasplacedat(record) {
  return Boolean(record && record['placedAt'] !== undefined && record['placedAt'] !== null && record['placedAt'] !== '');
}

function clearplacedat(record) {
  if (record) delete record['placedAt'];
  return record;
}

function validateplacedat(value) {
  const result = validatePayload({ 'placedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'placedAt');
}

function describeplacedat() {
  return describeParameter('placedAt');
}

function defaultplacedat() {
  return createDefaultParameters()['placedAt'];
}

const placedatParameter = Object.freeze({
  name: 'placedAt',
  definition: PARAMETER_DEFINITIONS['placedAt'],
  get: getplacedat,
  set: setplacedat,
  has: hasplacedat,
  clear: clearplacedat,
  validate: validateplacedat,
  describe: describeplacedat,
  defaultValue: defaultplacedat
});


function getconfirmedat(record) {
  return record ? clone(record['confirmedAt']) : undefined;
}

function setconfirmedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['confirmedAt'] = normalizeField('confirmedAt', value);
  return record;
}

function hasconfirmedat(record) {
  return Boolean(record && record['confirmedAt'] !== undefined && record['confirmedAt'] !== null && record['confirmedAt'] !== '');
}

function clearconfirmedat(record) {
  if (record) delete record['confirmedAt'];
  return record;
}

function validateconfirmedat(value) {
  const result = validatePayload({ 'confirmedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'confirmedAt');
}

function describeconfirmedat() {
  return describeParameter('confirmedAt');
}

function defaultconfirmedat() {
  return createDefaultParameters()['confirmedAt'];
}

const confirmedatParameter = Object.freeze({
  name: 'confirmedAt',
  definition: PARAMETER_DEFINITIONS['confirmedAt'],
  get: getconfirmedat,
  set: setconfirmedat,
  has: hasconfirmedat,
  clear: clearconfirmedat,
  validate: validateconfirmedat,
  describe: describeconfirmedat,
  defaultValue: defaultconfirmedat
});


function getshippedat(record) {
  return record ? clone(record['shippedAt']) : undefined;
}

function setshippedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shippedAt'] = normalizeField('shippedAt', value);
  return record;
}

function hasshippedat(record) {
  return Boolean(record && record['shippedAt'] !== undefined && record['shippedAt'] !== null && record['shippedAt'] !== '');
}

function clearshippedat(record) {
  if (record) delete record['shippedAt'];
  return record;
}

function validateshippedat(value) {
  const result = validatePayload({ 'shippedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shippedAt');
}

function describeshippedat() {
  return describeParameter('shippedAt');
}

function defaultshippedat() {
  return createDefaultParameters()['shippedAt'];
}

const shippedatParameter = Object.freeze({
  name: 'shippedAt',
  definition: PARAMETER_DEFINITIONS['shippedAt'],
  get: getshippedat,
  set: setshippedat,
  has: hasshippedat,
  clear: clearshippedat,
  validate: validateshippedat,
  describe: describeshippedat,
  defaultValue: defaultshippedat
});


function getdeliveredat(record) {
  return record ? clone(record['deliveredAt']) : undefined;
}

function setdeliveredat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['deliveredAt'] = normalizeField('deliveredAt', value);
  return record;
}

function hasdeliveredat(record) {
  return Boolean(record && record['deliveredAt'] !== undefined && record['deliveredAt'] !== null && record['deliveredAt'] !== '');
}

function cleardeliveredat(record) {
  if (record) delete record['deliveredAt'];
  return record;
}

function validatedeliveredat(value) {
  const result = validatePayload({ 'deliveredAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'deliveredAt');
}

function describedeliveredat() {
  return describeParameter('deliveredAt');
}

function defaultdeliveredat() {
  return createDefaultParameters()['deliveredAt'];
}

const deliveredatParameter = Object.freeze({
  name: 'deliveredAt',
  definition: PARAMETER_DEFINITIONS['deliveredAt'],
  get: getdeliveredat,
  set: setdeliveredat,
  has: hasdeliveredat,
  clear: cleardeliveredat,
  validate: validatedeliveredat,
  describe: describedeliveredat,
  defaultValue: defaultdeliveredat
});


function getcancelledat(record) {
  return record ? clone(record['cancelledAt']) : undefined;
}

function setcancelledat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['cancelledAt'] = normalizeField('cancelledAt', value);
  return record;
}

function hascancelledat(record) {
  return Boolean(record && record['cancelledAt'] !== undefined && record['cancelledAt'] !== null && record['cancelledAt'] !== '');
}

function clearcancelledat(record) {
  if (record) delete record['cancelledAt'];
  return record;
}

function validatecancelledat(value) {
  const result = validatePayload({ 'cancelledAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'cancelledAt');
}

function describecancelledat() {
  return describeParameter('cancelledAt');
}

function defaultcancelledat() {
  return createDefaultParameters()['cancelledAt'];
}

const cancelledatParameter = Object.freeze({
  name: 'cancelledAt',
  definition: PARAMETER_DEFINITIONS['cancelledAt'],
  get: getcancelledat,
  set: setcancelledat,
  has: hascancelledat,
  clear: clearcancelledat,
  validate: validatecancelledat,
  describe: describecancelledat,
  defaultValue: defaultcancelledat
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
  number: numberParameter,
  buyerid: buyeridParameter,
  currency: currencyParameter,
  subtotal: subtotalParameter,
  discount: discountParameter,
  shipping: shippingParameter,
  tax: taxParameter,
  total: totalParameter,
  status: statusParameter,
  paymentstatus: paymentstatusParameter,
  fulfillmentstatus: fulfillmentstatusParameter,
  shippingaddress: shippingaddressParameter,
  billingaddress: billingaddressParameter,
  placedat: placedatParameter,
  confirmedat: confirmedatParameter,
  shippedat: shippedatParameter,
  deliveredat: deliveredatParameter,
  cancelledat: cancelledatParameter,
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
  const value = normalizeField('number', input['number']);
  const definition = PARAMETER_DEFINITIONS['number'];
  return {
    field: 'number',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'number' : 'number')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
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
  const value = normalizeField('paymentStatus', input['paymentStatus']);
  const definition = PARAMETER_DEFINITIONS['paymentStatus'];
  return {
    field: 'paymentStatus',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'paymentStatus' : 'paymentStatus')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('fulfillmentStatus', input['fulfillmentStatus']);
  const definition = PARAMETER_DEFINITIONS['fulfillmentStatus'];
  return {
    field: 'fulfillmentStatus',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'fulfillmentStatus' : 'fulfillmentStatus')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
  const value = normalizeField('shippingAddress', input['shippingAddress']);
  const definition = PARAMETER_DEFINITIONS['shippingAddress'];
  return {
    field: 'shippingAddress',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shippingAddress' : 'shippingAddress')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_13(input = {}) {
  const value = normalizeField('billingAddress', input['billingAddress']);
  const definition = PARAMETER_DEFINITIONS['billingAddress'];
  return {
    field: 'billingAddress',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'billingAddress' : 'billingAddress')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_14(input = {}) {
  const value = normalizeField('placedAt', input['placedAt']);
  const definition = PARAMETER_DEFINITIONS['placedAt'];
  return {
    field: 'placedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'placedAt' : 'placedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_15(input = {}) {
  const value = normalizeField('confirmedAt', input['confirmedAt']);
  const definition = PARAMETER_DEFINITIONS['confirmedAt'];
  return {
    field: 'confirmedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'confirmedAt' : 'confirmedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_16(input = {}) {
  const value = normalizeField('shippedAt', input['shippedAt']);
  const definition = PARAMETER_DEFINITIONS['shippedAt'];
  return {
    field: 'shippedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shippedAt' : 'shippedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_17(input = {}) {
  const value = normalizeField('deliveredAt', input['deliveredAt']);
  const definition = PARAMETER_DEFINITIONS['deliveredAt'];
  return {
    field: 'deliveredAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'deliveredAt' : 'deliveredAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_18(input = {}) {
  const value = normalizeField('cancelledAt', input['cancelledAt']);
  const definition = PARAMETER_DEFINITIONS['cancelledAt'];
  return {
    field: 'cancelledAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'cancelledAt' : 'cancelledAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_19(input = {}) {
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

function parameterPolicy_20(input = {}) {
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
