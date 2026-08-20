
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'payments';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'orderId', 'buyerId', 'provider', 'transactionId', 'method', 'amount', 'currency', 'status', 'failureCode', 'failureMessage', 'paidAt', 'refundedAmount', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'buyerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'provider': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'transactionId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'method': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'amount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'currency': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'failureCode': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'failureMessage': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'paidAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'refundedAmount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
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


function getprovider(record) {
  return record ? clone(record['provider']) : undefined;
}

function setprovider(record, value) {
  if (!record) throw new TypeError('record is required');
  record['provider'] = normalizeField('provider', value);
  return record;
}

function hasprovider(record) {
  return Boolean(record && record['provider'] !== undefined && record['provider'] !== null && record['provider'] !== '');
}

function clearprovider(record) {
  if (record) delete record['provider'];
  return record;
}

function validateprovider(value) {
  const result = validatePayload({ 'provider': value }, { partial: true });
  return result.errors.filter(error => error.field === 'provider');
}

function describeprovider() {
  return describeParameter('provider');
}

function defaultprovider() {
  return createDefaultParameters()['provider'];
}

const providerParameter = Object.freeze({
  name: 'provider',
  definition: PARAMETER_DEFINITIONS['provider'],
  get: getprovider,
  set: setprovider,
  has: hasprovider,
  clear: clearprovider,
  validate: validateprovider,
  describe: describeprovider,
  defaultValue: defaultprovider
});


function gettransactionid(record) {
  return record ? clone(record['transactionId']) : undefined;
}

function settransactionid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['transactionId'] = normalizeField('transactionId', value);
  return record;
}

function hastransactionid(record) {
  return Boolean(record && record['transactionId'] !== undefined && record['transactionId'] !== null && record['transactionId'] !== '');
}

function cleartransactionid(record) {
  if (record) delete record['transactionId'];
  return record;
}

function validatetransactionid(value) {
  const result = validatePayload({ 'transactionId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'transactionId');
}

function describetransactionid() {
  return describeParameter('transactionId');
}

function defaulttransactionid() {
  return createDefaultParameters()['transactionId'];
}

const transactionidParameter = Object.freeze({
  name: 'transactionId',
  definition: PARAMETER_DEFINITIONS['transactionId'],
  get: gettransactionid,
  set: settransactionid,
  has: hastransactionid,
  clear: cleartransactionid,
  validate: validatetransactionid,
  describe: describetransactionid,
  defaultValue: defaulttransactionid
});


function getmethod(record) {
  return record ? clone(record['method']) : undefined;
}

function setmethod(record, value) {
  if (!record) throw new TypeError('record is required');
  record['method'] = normalizeField('method', value);
  return record;
}

function hasmethod(record) {
  return Boolean(record && record['method'] !== undefined && record['method'] !== null && record['method'] !== '');
}

function clearmethod(record) {
  if (record) delete record['method'];
  return record;
}

function validatemethod(value) {
  const result = validatePayload({ 'method': value }, { partial: true });
  return result.errors.filter(error => error.field === 'method');
}

function describemethod() {
  return describeParameter('method');
}

function defaultmethod() {
  return createDefaultParameters()['method'];
}

const methodParameter = Object.freeze({
  name: 'method',
  definition: PARAMETER_DEFINITIONS['method'],
  get: getmethod,
  set: setmethod,
  has: hasmethod,
  clear: clearmethod,
  validate: validatemethod,
  describe: describemethod,
  defaultValue: defaultmethod
});


function getamount(record) {
  return record ? clone(record['amount']) : undefined;
}

function setamount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['amount'] = normalizeField('amount', value);
  return record;
}

function hasamount(record) {
  return Boolean(record && record['amount'] !== undefined && record['amount'] !== null && record['amount'] !== '');
}

function clearamount(record) {
  if (record) delete record['amount'];
  return record;
}

function validateamount(value) {
  const result = validatePayload({ 'amount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'amount');
}

function describeamount() {
  return describeParameter('amount');
}

function defaultamount() {
  return createDefaultParameters()['amount'];
}

const amountParameter = Object.freeze({
  name: 'amount',
  definition: PARAMETER_DEFINITIONS['amount'],
  get: getamount,
  set: setamount,
  has: hasamount,
  clear: clearamount,
  validate: validateamount,
  describe: describeamount,
  defaultValue: defaultamount
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


function getfailurecode(record) {
  return record ? clone(record['failureCode']) : undefined;
}

function setfailurecode(record, value) {
  if (!record) throw new TypeError('record is required');
  record['failureCode'] = normalizeField('failureCode', value);
  return record;
}

function hasfailurecode(record) {
  return Boolean(record && record['failureCode'] !== undefined && record['failureCode'] !== null && record['failureCode'] !== '');
}

function clearfailurecode(record) {
  if (record) delete record['failureCode'];
  return record;
}

function validatefailurecode(value) {
  const result = validatePayload({ 'failureCode': value }, { partial: true });
  return result.errors.filter(error => error.field === 'failureCode');
}

function describefailurecode() {
  return describeParameter('failureCode');
}

function defaultfailurecode() {
  return createDefaultParameters()['failureCode'];
}

const failurecodeParameter = Object.freeze({
  name: 'failureCode',
  definition: PARAMETER_DEFINITIONS['failureCode'],
  get: getfailurecode,
  set: setfailurecode,
  has: hasfailurecode,
  clear: clearfailurecode,
  validate: validatefailurecode,
  describe: describefailurecode,
  defaultValue: defaultfailurecode
});


function getfailuremessage(record) {
  return record ? clone(record['failureMessage']) : undefined;
}

function setfailuremessage(record, value) {
  if (!record) throw new TypeError('record is required');
  record['failureMessage'] = normalizeField('failureMessage', value);
  return record;
}

function hasfailuremessage(record) {
  return Boolean(record && record['failureMessage'] !== undefined && record['failureMessage'] !== null && record['failureMessage'] !== '');
}

function clearfailuremessage(record) {
  if (record) delete record['failureMessage'];
  return record;
}

function validatefailuremessage(value) {
  const result = validatePayload({ 'failureMessage': value }, { partial: true });
  return result.errors.filter(error => error.field === 'failureMessage');
}

function describefailuremessage() {
  return describeParameter('failureMessage');
}

function defaultfailuremessage() {
  return createDefaultParameters()['failureMessage'];
}

const failuremessageParameter = Object.freeze({
  name: 'failureMessage',
  definition: PARAMETER_DEFINITIONS['failureMessage'],
  get: getfailuremessage,
  set: setfailuremessage,
  has: hasfailuremessage,
  clear: clearfailuremessage,
  validate: validatefailuremessage,
  describe: describefailuremessage,
  defaultValue: defaultfailuremessage
});


function getpaidat(record) {
  return record ? clone(record['paidAt']) : undefined;
}

function setpaidat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['paidAt'] = normalizeField('paidAt', value);
  return record;
}

function haspaidat(record) {
  return Boolean(record && record['paidAt'] !== undefined && record['paidAt'] !== null && record['paidAt'] !== '');
}

function clearpaidat(record) {
  if (record) delete record['paidAt'];
  return record;
}

function validatepaidat(value) {
  const result = validatePayload({ 'paidAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'paidAt');
}

function describepaidat() {
  return describeParameter('paidAt');
}

function defaultpaidat() {
  return createDefaultParameters()['paidAt'];
}

const paidatParameter = Object.freeze({
  name: 'paidAt',
  definition: PARAMETER_DEFINITIONS['paidAt'],
  get: getpaidat,
  set: setpaidat,
  has: haspaidat,
  clear: clearpaidat,
  validate: validatepaidat,
  describe: describepaidat,
  defaultValue: defaultpaidat
});


function getrefundedamount(record) {
  return record ? clone(record['refundedAmount']) : undefined;
}

function setrefundedamount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['refundedAmount'] = normalizeField('refundedAmount', value);
  return record;
}

function hasrefundedamount(record) {
  return Boolean(record && record['refundedAmount'] !== undefined && record['refundedAmount'] !== null && record['refundedAmount'] !== '');
}

function clearrefundedamount(record) {
  if (record) delete record['refundedAmount'];
  return record;
}

function validaterefundedamount(value) {
  const result = validatePayload({ 'refundedAmount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'refundedAmount');
}

function describerefundedamount() {
  return describeParameter('refundedAmount');
}

function defaultrefundedamount() {
  return createDefaultParameters()['refundedAmount'];
}

const refundedamountParameter = Object.freeze({
  name: 'refundedAmount',
  definition: PARAMETER_DEFINITIONS['refundedAmount'],
  get: getrefundedamount,
  set: setrefundedamount,
  has: hasrefundedamount,
  clear: clearrefundedamount,
  validate: validaterefundedamount,
  describe: describerefundedamount,
  defaultValue: defaultrefundedamount
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
  buyerid: buyeridParameter,
  provider: providerParameter,
  transactionid: transactionidParameter,
  method: methodParameter,
  amount: amountParameter,
  currency: currencyParameter,
  status: statusParameter,
  failurecode: failurecodeParameter,
  failuremessage: failuremessageParameter,
  paidat: paidatParameter,
  refundedamount: refundedamountParameter,
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
  const value = normalizeField('provider', input['provider']);
  const definition = PARAMETER_DEFINITIONS['provider'];
  return {
    field: 'provider',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'provider' : 'provider')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('transactionId', input['transactionId']);
  const definition = PARAMETER_DEFINITIONS['transactionId'];
  return {
    field: 'transactionId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'transactionId' : 'transactionId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('method', input['method']);
  const definition = PARAMETER_DEFINITIONS['method'];
  return {
    field: 'method',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'method' : 'method')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('amount', input['amount']);
  const definition = PARAMETER_DEFINITIONS['amount'];
  return {
    field: 'amount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'amount' : 'amount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
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

function parameterPolicy_8(input = {}) {
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

function parameterPolicy_9(input = {}) {
  const value = normalizeField('failureCode', input['failureCode']);
  const definition = PARAMETER_DEFINITIONS['failureCode'];
  return {
    field: 'failureCode',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'failureCode' : 'failureCode')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('failureMessage', input['failureMessage']);
  const definition = PARAMETER_DEFINITIONS['failureMessage'];
  return {
    field: 'failureMessage',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'failureMessage' : 'failureMessage')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('paidAt', input['paidAt']);
  const definition = PARAMETER_DEFINITIONS['paidAt'];
  return {
    field: 'paidAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'paidAt' : 'paidAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
  const value = normalizeField('refundedAmount', input['refundedAmount']);
  const definition = PARAMETER_DEFINITIONS['refundedAmount'];
  return {
    field: 'refundedAmount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'refundedAmount' : 'refundedAmount')]: value }, { partial: true }).valid
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
