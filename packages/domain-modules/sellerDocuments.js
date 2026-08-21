
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'sellerDocuments';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'sellerId', 'type', 'url', 'documentNumber', 'expiresAt', 'status', 'verifiedBy', 'verifiedAt', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sellerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'url': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'documentNumber': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'expiresAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'verifiedBy': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'verifiedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function gettype(record) {
  return record ? clone(record['type']) : undefined;
}

function settype(record, value) {
  if (!record) throw new TypeError('record is required');
  record['type'] = normalizeField('type', value);
  return record;
}

function hastype(record) {
  return Boolean(record && record['type'] !== undefined && record['type'] !== null && record['type'] !== '');
}

function cleartype(record) {
  if (record) delete record['type'];
  return record;
}

function validatetype(value) {
  const result = validatePayload({ 'type': value }, { partial: true });
  return result.errors.filter(error => error.field === 'type');
}

function describetype() {
  return describeParameter('type');
}

function defaulttype() {
  return createDefaultParameters()['type'];
}

const typeParameter = Object.freeze({
  name: 'type',
  definition: PARAMETER_DEFINITIONS['type'],
  get: gettype,
  set: settype,
  has: hastype,
  clear: cleartype,
  validate: validatetype,
  describe: describetype,
  defaultValue: defaulttype
});


function geturl(record) {
  return record ? clone(record['url']) : undefined;
}

function seturl(record, value) {
  if (!record) throw new TypeError('record is required');
  record['url'] = normalizeField('url', value);
  return record;
}

function hasurl(record) {
  return Boolean(record && record['url'] !== undefined && record['url'] !== null && record['url'] !== '');
}

function clearurl(record) {
  if (record) delete record['url'];
  return record;
}

function validateurl(value) {
  const result = validatePayload({ 'url': value }, { partial: true });
  return result.errors.filter(error => error.field === 'url');
}

function describeurl() {
  return describeParameter('url');
}

function defaulturl() {
  return createDefaultParameters()['url'];
}

const urlParameter = Object.freeze({
  name: 'url',
  definition: PARAMETER_DEFINITIONS['url'],
  get: geturl,
  set: seturl,
  has: hasurl,
  clear: clearurl,
  validate: validateurl,
  describe: describeurl,
  defaultValue: defaulturl
});


function getdocumentnumber(record) {
  return record ? clone(record['documentNumber']) : undefined;
}

function setdocumentnumber(record, value) {
  if (!record) throw new TypeError('record is required');
  record['documentNumber'] = normalizeField('documentNumber', value);
  return record;
}

function hasdocumentnumber(record) {
  return Boolean(record && record['documentNumber'] !== undefined && record['documentNumber'] !== null && record['documentNumber'] !== '');
}

function cleardocumentnumber(record) {
  if (record) delete record['documentNumber'];
  return record;
}

function validatedocumentnumber(value) {
  const result = validatePayload({ 'documentNumber': value }, { partial: true });
  return result.errors.filter(error => error.field === 'documentNumber');
}

function describedocumentnumber() {
  return describeParameter('documentNumber');
}

function defaultdocumentnumber() {
  return createDefaultParameters()['documentNumber'];
}

const documentnumberParameter = Object.freeze({
  name: 'documentNumber',
  definition: PARAMETER_DEFINITIONS['documentNumber'],
  get: getdocumentnumber,
  set: setdocumentnumber,
  has: hasdocumentnumber,
  clear: cleardocumentnumber,
  validate: validatedocumentnumber,
  describe: describedocumentnumber,
  defaultValue: defaultdocumentnumber
});


function getexpiresat(record) {
  return record ? clone(record['expiresAt']) : undefined;
}

function setexpiresat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['expiresAt'] = normalizeField('expiresAt', value);
  return record;
}

function hasexpiresat(record) {
  return Boolean(record && record['expiresAt'] !== undefined && record['expiresAt'] !== null && record['expiresAt'] !== '');
}

function clearexpiresat(record) {
  if (record) delete record['expiresAt'];
  return record;
}

function validateexpiresat(value) {
  const result = validatePayload({ 'expiresAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'expiresAt');
}

function describeexpiresat() {
  return describeParameter('expiresAt');
}

function defaultexpiresat() {
  return createDefaultParameters()['expiresAt'];
}

const expiresatParameter = Object.freeze({
  name: 'expiresAt',
  definition: PARAMETER_DEFINITIONS['expiresAt'],
  get: getexpiresat,
  set: setexpiresat,
  has: hasexpiresat,
  clear: clearexpiresat,
  validate: validateexpiresat,
  describe: describeexpiresat,
  defaultValue: defaultexpiresat
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


function getverifiedby(record) {
  return record ? clone(record['verifiedBy']) : undefined;
}

function setverifiedby(record, value) {
  if (!record) throw new TypeError('record is required');
  record['verifiedBy'] = normalizeField('verifiedBy', value);
  return record;
}

function hasverifiedby(record) {
  return Boolean(record && record['verifiedBy'] !== undefined && record['verifiedBy'] !== null && record['verifiedBy'] !== '');
}

function clearverifiedby(record) {
  if (record) delete record['verifiedBy'];
  return record;
}

function validateverifiedby(value) {
  const result = validatePayload({ 'verifiedBy': value }, { partial: true });
  return result.errors.filter(error => error.field === 'verifiedBy');
}

function describeverifiedby() {
  return describeParameter('verifiedBy');
}

function defaultverifiedby() {
  return createDefaultParameters()['verifiedBy'];
}

const verifiedbyParameter = Object.freeze({
  name: 'verifiedBy',
  definition: PARAMETER_DEFINITIONS['verifiedBy'],
  get: getverifiedby,
  set: setverifiedby,
  has: hasverifiedby,
  clear: clearverifiedby,
  validate: validateverifiedby,
  describe: describeverifiedby,
  defaultValue: defaultverifiedby
});


function getverifiedat(record) {
  return record ? clone(record['verifiedAt']) : undefined;
}

function setverifiedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['verifiedAt'] = normalizeField('verifiedAt', value);
  return record;
}

function hasverifiedat(record) {
  return Boolean(record && record['verifiedAt'] !== undefined && record['verifiedAt'] !== null && record['verifiedAt'] !== '');
}

function clearverifiedat(record) {
  if (record) delete record['verifiedAt'];
  return record;
}

function validateverifiedat(value) {
  const result = validatePayload({ 'verifiedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'verifiedAt');
}

function describeverifiedat() {
  return describeParameter('verifiedAt');
}

function defaultverifiedat() {
  return createDefaultParameters()['verifiedAt'];
}

const verifiedatParameter = Object.freeze({
  name: 'verifiedAt',
  definition: PARAMETER_DEFINITIONS['verifiedAt'],
  get: getverifiedat,
  set: setverifiedat,
  has: hasverifiedat,
  clear: clearverifiedat,
  validate: validateverifiedat,
  describe: describeverifiedat,
  defaultValue: defaultverifiedat
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
  type: typeParameter,
  url: urlParameter,
  documentnumber: documentnumberParameter,
  expiresat: expiresatParameter,
  status: statusParameter,
  verifiedby: verifiedbyParameter,
  verifiedat: verifiedatParameter,
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
  const value = normalizeField('type', input['type']);
  const definition = PARAMETER_DEFINITIONS['type'];
  return {
    field: 'type',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'type' : 'type')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('url', input['url']);
  const definition = PARAMETER_DEFINITIONS['url'];
  return {
    field: 'url',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'url' : 'url')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('documentNumber', input['documentNumber']);
  const definition = PARAMETER_DEFINITIONS['documentNumber'];
  return {
    field: 'documentNumber',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'documentNumber' : 'documentNumber')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('expiresAt', input['expiresAt']);
  const definition = PARAMETER_DEFINITIONS['expiresAt'];
  return {
    field: 'expiresAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'expiresAt' : 'expiresAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
  const value = normalizeField('verifiedBy', input['verifiedBy']);
  const definition = PARAMETER_DEFINITIONS['verifiedBy'];
  return {
    field: 'verifiedBy',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'verifiedBy' : 'verifiedBy')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('verifiedAt', input['verifiedAt']);
  const definition = PARAMETER_DEFINITIONS['verifiedAt'];
  return {
    field: 'verifiedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'verifiedAt' : 'verifiedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
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
