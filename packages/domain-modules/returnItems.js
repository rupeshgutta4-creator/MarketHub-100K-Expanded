
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'returnItems';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'returnId', 'orderItemId', 'productId', 'quantity', 'condition', 'reason', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'returnId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderItemId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'quantity': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'condition': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'reason': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'createdAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getreturnid(record) {
  return record ? clone(record['returnId']) : undefined;
}

function setreturnid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['returnId'] = normalizeField('returnId', value);
  return record;
}

function hasreturnid(record) {
  return Boolean(record && record['returnId'] !== undefined && record['returnId'] !== null && record['returnId'] !== '');
}

function clearreturnid(record) {
  if (record) delete record['returnId'];
  return record;
}

function validatereturnid(value) {
  const result = validatePayload({ 'returnId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'returnId');
}

function describereturnid() {
  return describeParameter('returnId');
}

function defaultreturnid() {
  return createDefaultParameters()['returnId'];
}

const returnidParameter = Object.freeze({
  name: 'returnId',
  definition: PARAMETER_DEFINITIONS['returnId'],
  get: getreturnid,
  set: setreturnid,
  has: hasreturnid,
  clear: clearreturnid,
  validate: validatereturnid,
  describe: describereturnid,
  defaultValue: defaultreturnid
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


const PARAMETERS = Object.freeze({
  id: idParameter,
  returnid: returnidParameter,
  orderitemid: orderitemidParameter,
  productid: productidParameter,
  quantity: quantityParameter,
  condition: conditionParameter,
  reason: reasonParameter,
  createdat: createdatParameter,
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
  const value = normalizeField('returnId', input['returnId']);
  const definition = PARAMETER_DEFINITIONS['returnId'];
  return {
    field: 'returnId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'returnId' : 'returnId')]: value }, { partial: true }).valid
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

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
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

for (const [index, field] of FIELD_NAMES.entries()) {
  module.exports[`parameterPolicy_${index}`] = input => {
    const definition = PARAMETER_DEFINITIONS[field];
    const value = normalizeField(field, input ? input[field] : undefined);
    return { field, value, type: definition.type, required: definition.required, nullable: definition.nullable };
  };
}
