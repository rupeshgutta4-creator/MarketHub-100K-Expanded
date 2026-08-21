
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'sellerPayouts';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'sellerId', 'periodStart', 'periodEnd', 'grossSales', 'refunds', 'fees', 'tax', 'netAmount', 'currency', 'status', 'paidAt', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sellerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'periodStart': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'periodEnd': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'grossSales': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'refunds': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'fees': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'tax': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'netAmount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'currency': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'paidAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getperiodstart(record) {
  return record ? clone(record['periodStart']) : undefined;
}

function setperiodstart(record, value) {
  if (!record) throw new TypeError('record is required');
  record['periodStart'] = normalizeField('periodStart', value);
  return record;
}

function hasperiodstart(record) {
  return Boolean(record && record['periodStart'] !== undefined && record['periodStart'] !== null && record['periodStart'] !== '');
}

function clearperiodstart(record) {
  if (record) delete record['periodStart'];
  return record;
}

function validateperiodstart(value) {
  const result = validatePayload({ 'periodStart': value }, { partial: true });
  return result.errors.filter(error => error.field === 'periodStart');
}

function describeperiodstart() {
  return describeParameter('periodStart');
}

function defaultperiodstart() {
  return createDefaultParameters()['periodStart'];
}

const periodstartParameter = Object.freeze({
  name: 'periodStart',
  definition: PARAMETER_DEFINITIONS['periodStart'],
  get: getperiodstart,
  set: setperiodstart,
  has: hasperiodstart,
  clear: clearperiodstart,
  validate: validateperiodstart,
  describe: describeperiodstart,
  defaultValue: defaultperiodstart
});


function getperiodend(record) {
  return record ? clone(record['periodEnd']) : undefined;
}

function setperiodend(record, value) {
  if (!record) throw new TypeError('record is required');
  record['periodEnd'] = normalizeField('periodEnd', value);
  return record;
}

function hasperiodend(record) {
  return Boolean(record && record['periodEnd'] !== undefined && record['periodEnd'] !== null && record['periodEnd'] !== '');
}

function clearperiodend(record) {
  if (record) delete record['periodEnd'];
  return record;
}

function validateperiodend(value) {
  const result = validatePayload({ 'periodEnd': value }, { partial: true });
  return result.errors.filter(error => error.field === 'periodEnd');
}

function describeperiodend() {
  return describeParameter('periodEnd');
}

function defaultperiodend() {
  return createDefaultParameters()['periodEnd'];
}

const periodendParameter = Object.freeze({
  name: 'periodEnd',
  definition: PARAMETER_DEFINITIONS['periodEnd'],
  get: getperiodend,
  set: setperiodend,
  has: hasperiodend,
  clear: clearperiodend,
  validate: validateperiodend,
  describe: describeperiodend,
  defaultValue: defaultperiodend
});


function getgrosssales(record) {
  return record ? clone(record['grossSales']) : undefined;
}

function setgrosssales(record, value) {
  if (!record) throw new TypeError('record is required');
  record['grossSales'] = normalizeField('grossSales', value);
  return record;
}

function hasgrosssales(record) {
  return Boolean(record && record['grossSales'] !== undefined && record['grossSales'] !== null && record['grossSales'] !== '');
}

function cleargrosssales(record) {
  if (record) delete record['grossSales'];
  return record;
}

function validategrosssales(value) {
  const result = validatePayload({ 'grossSales': value }, { partial: true });
  return result.errors.filter(error => error.field === 'grossSales');
}

function describegrosssales() {
  return describeParameter('grossSales');
}

function defaultgrosssales() {
  return createDefaultParameters()['grossSales'];
}

const grosssalesParameter = Object.freeze({
  name: 'grossSales',
  definition: PARAMETER_DEFINITIONS['grossSales'],
  get: getgrosssales,
  set: setgrosssales,
  has: hasgrosssales,
  clear: cleargrosssales,
  validate: validategrosssales,
  describe: describegrosssales,
  defaultValue: defaultgrosssales
});


function getrefunds(record) {
  return record ? clone(record['refunds']) : undefined;
}

function setrefunds(record, value) {
  if (!record) throw new TypeError('record is required');
  record['refunds'] = normalizeField('refunds', value);
  return record;
}

function hasrefunds(record) {
  return Boolean(record && record['refunds'] !== undefined && record['refunds'] !== null && record['refunds'] !== '');
}

function clearrefunds(record) {
  if (record) delete record['refunds'];
  return record;
}

function validaterefunds(value) {
  const result = validatePayload({ 'refunds': value }, { partial: true });
  return result.errors.filter(error => error.field === 'refunds');
}

function describerefunds() {
  return describeParameter('refunds');
}

function defaultrefunds() {
  return createDefaultParameters()['refunds'];
}

const refundsParameter = Object.freeze({
  name: 'refunds',
  definition: PARAMETER_DEFINITIONS['refunds'],
  get: getrefunds,
  set: setrefunds,
  has: hasrefunds,
  clear: clearrefunds,
  validate: validaterefunds,
  describe: describerefunds,
  defaultValue: defaultrefunds
});


function getfees(record) {
  return record ? clone(record['fees']) : undefined;
}

function setfees(record, value) {
  if (!record) throw new TypeError('record is required');
  record['fees'] = normalizeField('fees', value);
  return record;
}

function hasfees(record) {
  return Boolean(record && record['fees'] !== undefined && record['fees'] !== null && record['fees'] !== '');
}

function clearfees(record) {
  if (record) delete record['fees'];
  return record;
}

function validatefees(value) {
  const result = validatePayload({ 'fees': value }, { partial: true });
  return result.errors.filter(error => error.field === 'fees');
}

function describefees() {
  return describeParameter('fees');
}

function defaultfees() {
  return createDefaultParameters()['fees'];
}

const feesParameter = Object.freeze({
  name: 'fees',
  definition: PARAMETER_DEFINITIONS['fees'],
  get: getfees,
  set: setfees,
  has: hasfees,
  clear: clearfees,
  validate: validatefees,
  describe: describefees,
  defaultValue: defaultfees
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


function getnetamount(record) {
  return record ? clone(record['netAmount']) : undefined;
}

function setnetamount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['netAmount'] = normalizeField('netAmount', value);
  return record;
}

function hasnetamount(record) {
  return Boolean(record && record['netAmount'] !== undefined && record['netAmount'] !== null && record['netAmount'] !== '');
}

function clearnetamount(record) {
  if (record) delete record['netAmount'];
  return record;
}

function validatenetamount(value) {
  const result = validatePayload({ 'netAmount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'netAmount');
}

function describenetamount() {
  return describeParameter('netAmount');
}

function defaultnetamount() {
  return createDefaultParameters()['netAmount'];
}

const netamountParameter = Object.freeze({
  name: 'netAmount',
  definition: PARAMETER_DEFINITIONS['netAmount'],
  get: getnetamount,
  set: setnetamount,
  has: hasnetamount,
  clear: clearnetamount,
  validate: validatenetamount,
  describe: describenetamount,
  defaultValue: defaultnetamount
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
  sellerid: selleridParameter,
  periodstart: periodstartParameter,
  periodend: periodendParameter,
  grosssales: grosssalesParameter,
  refunds: refundsParameter,
  fees: feesParameter,
  tax: taxParameter,
  netamount: netamountParameter,
  currency: currencyParameter,
  status: statusParameter,
  paidat: paidatParameter,
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
  const value = normalizeField('periodStart', input['periodStart']);
  const definition = PARAMETER_DEFINITIONS['periodStart'];
  return {
    field: 'periodStart',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'periodStart' : 'periodStart')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('periodEnd', input['periodEnd']);
  const definition = PARAMETER_DEFINITIONS['periodEnd'];
  return {
    field: 'periodEnd',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'periodEnd' : 'periodEnd')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('grossSales', input['grossSales']);
  const definition = PARAMETER_DEFINITIONS['grossSales'];
  return {
    field: 'grossSales',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'grossSales' : 'grossSales')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('refunds', input['refunds']);
  const definition = PARAMETER_DEFINITIONS['refunds'];
  return {
    field: 'refunds',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'refunds' : 'refunds')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('fees', input['fees']);
  const definition = PARAMETER_DEFINITIONS['fees'];
  return {
    field: 'fees',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'fees' : 'fees')]: value }, { partial: true }).valid
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
  const value = normalizeField('netAmount', input['netAmount']);
  const definition = PARAMETER_DEFINITIONS['netAmount'];
  return {
    field: 'netAmount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'netAmount' : 'netAmount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
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

function parameterPolicy_10(input = {}) {
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
