
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'returns';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'orderId', 'orderItemId', 'buyerId', 'sellerId', 'reason', 'quantity', 'status', 'refundAmount', 'requestedAt', 'approvedAt', 'receivedAt', 'completedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderItemId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'buyerId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'sellerId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'reason': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'quantity': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'refundAmount': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'requestedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'approvedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'receivedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'completedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getorderitemid(record) {
  return record ? clone(record['orderItemId']) : undefined;
}

function setorderitemid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['orderItemId'] = normalizeField('orderItemId', value);
  return record;
}

function hasorderitemid(record) {
  return Boolean(record && record['orderItemId'] !== undefined && record['orderItemId'] !== null && record['orderItemId'] !== '');
}

function clearorderitemid(record) {
  if (record) delete record['orderItemId'];
  return record;
}

function validateorderitemid(value) {
  const result = validatePayload({ 'orderItemId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'orderItemId');
}

function describeorderitemid() {
  return describeParameter('orderItemId');
}

function defaultorderitemid() {
  return createDefaultParameters()['orderItemId'];
}

const orderitemidParameter = Object.freeze({
  name: 'orderItemId',
  definition: PARAMETER_DEFINITIONS['orderItemId'],
  get: getorderitemid,
  set: setorderitemid,
  has: hasorderitemid,
  clear: clearorderitemid,
  validate: validateorderitemid,
  describe: describeorderitemid,
  defaultValue: defaultorderitemid
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


function getreason(record) {
  return record ? clone(record['reason']) : undefined;
}

function setreason(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reason'] = normalizeField('reason', value);
  return record;
}

function hasreason(record) {
  return Boolean(record && record['reason'] !== undefined && record['reason'] !== null && record['reason'] !== '');
}

function clearreason(record) {
  if (record) delete record['reason'];
  return record;
}

function validatereason(value) {
  const result = validatePayload({ 'reason': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reason');
}

function describereason() {
  return describeParameter('reason');
}

function defaultreason() {
  return createDefaultParameters()['reason'];
}

const reasonParameter = Object.freeze({
  name: 'reason',
  definition: PARAMETER_DEFINITIONS['reason'],
  get: getreason,
  set: setreason,
  has: hasreason,
  clear: clearreason,
  validate: validatereason,
  describe: describereason,
  defaultValue: defaultreason
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


function getrefundamount(record) {
  return record ? clone(record['refundAmount']) : undefined;
}

function setrefundamount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['refundAmount'] = normalizeField('refundAmount', value);
  return record;
}

function hasrefundamount(record) {
  return Boolean(record && record['refundAmount'] !== undefined && record['refundAmount'] !== null && record['refundAmount'] !== '');
}

function clearrefundamount(record) {
  if (record) delete record['refundAmount'];
  return record;
}

function validaterefundamount(value) {
  const result = validatePayload({ 'refundAmount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'refundAmount');
}

function describerefundamount() {
  return describeParameter('refundAmount');
}

function defaultrefundamount() {
  return createDefaultParameters()['refundAmount'];
}

const refundamountParameter = Object.freeze({
  name: 'refundAmount',
  definition: PARAMETER_DEFINITIONS['refundAmount'],
  get: getrefundamount,
  set: setrefundamount,
  has: hasrefundamount,
  clear: clearrefundamount,
  validate: validaterefundamount,
  describe: describerefundamount,
  defaultValue: defaultrefundamount
});


function getrequestedat(record) {
  return record ? clone(record['requestedAt']) : undefined;
}

function setrequestedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['requestedAt'] = normalizeField('requestedAt', value);
  return record;
}

function hasrequestedat(record) {
  return Boolean(record && record['requestedAt'] !== undefined && record['requestedAt'] !== null && record['requestedAt'] !== '');
}

function clearrequestedat(record) {
  if (record) delete record['requestedAt'];
  return record;
}

function validaterequestedat(value) {
  const result = validatePayload({ 'requestedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'requestedAt');
}

function describerequestedat() {
  return describeParameter('requestedAt');
}

function defaultrequestedat() {
  return createDefaultParameters()['requestedAt'];
}

const requestedatParameter = Object.freeze({
  name: 'requestedAt',
  definition: PARAMETER_DEFINITIONS['requestedAt'],
  get: getrequestedat,
  set: setrequestedat,
  has: hasrequestedat,
  clear: clearrequestedat,
  validate: validaterequestedat,
  describe: describerequestedat,
  defaultValue: defaultrequestedat
});


function getapprovedat(record) {
  return record ? clone(record['approvedAt']) : undefined;
}

function setapprovedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['approvedAt'] = normalizeField('approvedAt', value);
  return record;
}

function hasapprovedat(record) {
  return Boolean(record && record['approvedAt'] !== undefined && record['approvedAt'] !== null && record['approvedAt'] !== '');
}

function clearapprovedat(record) {
  if (record) delete record['approvedAt'];
  return record;
}

function validateapprovedat(value) {
  const result = validatePayload({ 'approvedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'approvedAt');
}

function describeapprovedat() {
  return describeParameter('approvedAt');
}

function defaultapprovedat() {
  return createDefaultParameters()['approvedAt'];
}

const approvedatParameter = Object.freeze({
  name: 'approvedAt',
  definition: PARAMETER_DEFINITIONS['approvedAt'],
  get: getapprovedat,
  set: setapprovedat,
  has: hasapprovedat,
  clear: clearapprovedat,
  validate: validateapprovedat,
  describe: describeapprovedat,
  defaultValue: defaultapprovedat
});


function getreceivedat(record) {
  return record ? clone(record['receivedAt']) : undefined;
}

function setreceivedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['receivedAt'] = normalizeField('receivedAt', value);
  return record;
}

function hasreceivedat(record) {
  return Boolean(record && record['receivedAt'] !== undefined && record['receivedAt'] !== null && record['receivedAt'] !== '');
}

function clearreceivedat(record) {
  if (record) delete record['receivedAt'];
  return record;
}

function validatereceivedat(value) {
  const result = validatePayload({ 'receivedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'receivedAt');
}

function describereceivedat() {
  return describeParameter('receivedAt');
}

function defaultreceivedat() {
  return createDefaultParameters()['receivedAt'];
}

const receivedatParameter = Object.freeze({
  name: 'receivedAt',
  definition: PARAMETER_DEFINITIONS['receivedAt'],
  get: getreceivedat,
  set: setreceivedat,
  has: hasreceivedat,
  clear: clearreceivedat,
  validate: validatereceivedat,
  describe: describereceivedat,
  defaultValue: defaultreceivedat
});


function getcompletedat(record) {
  return record ? clone(record['completedAt']) : undefined;
}

function setcompletedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['completedAt'] = normalizeField('completedAt', value);
  return record;
}

function hascompletedat(record) {
  return Boolean(record && record['completedAt'] !== undefined && record['completedAt'] !== null && record['completedAt'] !== '');
}

function clearcompletedat(record) {
  if (record) delete record['completedAt'];
  return record;
}

function validatecompletedat(value) {
  const result = validatePayload({ 'completedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'completedAt');
}

function describecompletedat() {
  return describeParameter('completedAt');
}

function defaultcompletedat() {
  return createDefaultParameters()['completedAt'];
}

const completedatParameter = Object.freeze({
  name: 'completedAt',
  definition: PARAMETER_DEFINITIONS['completedAt'],
  get: getcompletedat,
  set: setcompletedat,
  has: hascompletedat,
  clear: clearcompletedat,
  validate: validatecompletedat,
  describe: describecompletedat,
  defaultValue: defaultcompletedat
});


const PARAMETERS = Object.freeze({
  id: idParameter,
  orderid: orderidParameter,
  orderitemid: orderitemidParameter,
  buyerid: buyeridParameter,
  sellerid: selleridParameter,
  reason: reasonParameter,
  quantity: quantityParameter,
  status: statusParameter,
  refundamount: refundamountParameter,
  requestedat: requestedatParameter,
  approvedat: approvedatParameter,
  receivedat: receivedatParameter,
  completedat: completedatParameter,
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
  const value = normalizeField('orderItemId', input['orderItemId']);
  const definition = PARAMETER_DEFINITIONS['orderItemId'];
  return {
    field: 'orderItemId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'orderItemId' : 'orderItemId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
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

function parameterPolicy_4(input = {}) {
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

function parameterPolicy_5(input = {}) {
  const value = normalizeField('reason', input['reason']);
  const definition = PARAMETER_DEFINITIONS['reason'];
  return {
    field: 'reason',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reason' : 'reason')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
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

function parameterPolicy_8(input = {}) {
  const value = normalizeField('refundAmount', input['refundAmount']);
  const definition = PARAMETER_DEFINITIONS['refundAmount'];
  return {
    field: 'refundAmount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'refundAmount' : 'refundAmount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('requestedAt', input['requestedAt']);
  const definition = PARAMETER_DEFINITIONS['requestedAt'];
  return {
    field: 'requestedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'requestedAt' : 'requestedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('approvedAt', input['approvedAt']);
  const definition = PARAMETER_DEFINITIONS['approvedAt'];
  return {
    field: 'approvedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'approvedAt' : 'approvedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('receivedAt', input['receivedAt']);
  const definition = PARAMETER_DEFINITIONS['receivedAt'];
  return {
    field: 'receivedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'receivedAt' : 'receivedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
  const value = normalizeField('completedAt', input['completedAt']);
  const definition = PARAMETER_DEFINITIONS['completedAt'];
  return {
    field: 'completedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'completedAt' : 'completedAt')]: value }, { partial: true }).valid
  };
}

for (const [index, field] of FIELD_NAMES.entries()) {
  module.exports[`parameterPolicy_${index}`] = input => {
    const definition = PARAMETER_DEFINITIONS[field];
    const value = normalizeField(field, input ? input[field] : undefined);
    return { field, value, type: definition.type, required: definition.required, nullable: definition.nullable };
  };
}
