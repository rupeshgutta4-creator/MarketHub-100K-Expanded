
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'adminActions';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'adminId', 'action', 'entityType', 'entityId', 'before', 'after', 'ipAddress', 'userAgent', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'adminId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'action': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'entityType': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'entityId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'before': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'after': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'ipAddress': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'userAgent': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getadminid(record) {
  return record ? clone(record['adminId']) : undefined;
}

function setadminid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['adminId'] = normalizeField('adminId', value);
  return record;
}

function hasadminid(record) {
  return Boolean(record && record['adminId'] !== undefined && record['adminId'] !== null && record['adminId'] !== '');
}

function clearadminid(record) {
  if (record) delete record['adminId'];
  return record;
}

function validateadminid(value) {
  const result = validatePayload({ 'adminId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'adminId');
}

function describeadminid() {
  return describeParameter('adminId');
}

function defaultadminid() {
  return createDefaultParameters()['adminId'];
}

const adminidParameter = Object.freeze({
  name: 'adminId',
  definition: PARAMETER_DEFINITIONS['adminId'],
  get: getadminid,
  set: setadminid,
  has: hasadminid,
  clear: clearadminid,
  validate: validateadminid,
  describe: describeadminid,
  defaultValue: defaultadminid
});


function getaction(record) {
  return record ? clone(record['action']) : undefined;
}

function setaction(record, value) {
  if (!record) throw new TypeError('record is required');
  record['action'] = normalizeField('action', value);
  return record;
}

function hasaction(record) {
  return Boolean(record && record['action'] !== undefined && record['action'] !== null && record['action'] !== '');
}

function clearaction(record) {
  if (record) delete record['action'];
  return record;
}

function validateaction(value) {
  const result = validatePayload({ 'action': value }, { partial: true });
  return result.errors.filter(error => error.field === 'action');
}

function describeaction() {
  return describeParameter('action');
}

function defaultaction() {
  return createDefaultParameters()['action'];
}

const actionParameter = Object.freeze({
  name: 'action',
  definition: PARAMETER_DEFINITIONS['action'],
  get: getaction,
  set: setaction,
  has: hasaction,
  clear: clearaction,
  validate: validateaction,
  describe: describeaction,
  defaultValue: defaultaction
});


function getentitytype(record) {
  return record ? clone(record['entityType']) : undefined;
}

function setentitytype(record, value) {
  if (!record) throw new TypeError('record is required');
  record['entityType'] = normalizeField('entityType', value);
  return record;
}

function hasentitytype(record) {
  return Boolean(record && record['entityType'] !== undefined && record['entityType'] !== null && record['entityType'] !== '');
}

function clearentitytype(record) {
  if (record) delete record['entityType'];
  return record;
}

function validateentitytype(value) {
  const result = validatePayload({ 'entityType': value }, { partial: true });
  return result.errors.filter(error => error.field === 'entityType');
}

function describeentitytype() {
  return describeParameter('entityType');
}

function defaultentitytype() {
  return createDefaultParameters()['entityType'];
}

const entitytypeParameter = Object.freeze({
  name: 'entityType',
  definition: PARAMETER_DEFINITIONS['entityType'],
  get: getentitytype,
  set: setentitytype,
  has: hasentitytype,
  clear: clearentitytype,
  validate: validateentitytype,
  describe: describeentitytype,
  defaultValue: defaultentitytype
});


function getentityid(record) {
  return record ? clone(record['entityId']) : undefined;
}

function setentityid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['entityId'] = normalizeField('entityId', value);
  return record;
}

function hasentityid(record) {
  return Boolean(record && record['entityId'] !== undefined && record['entityId'] !== null && record['entityId'] !== '');
}

function clearentityid(record) {
  if (record) delete record['entityId'];
  return record;
}

function validateentityid(value) {
  const result = validatePayload({ 'entityId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'entityId');
}

function describeentityid() {
  return describeParameter('entityId');
}

function defaultentityid() {
  return createDefaultParameters()['entityId'];
}

const entityidParameter = Object.freeze({
  name: 'entityId',
  definition: PARAMETER_DEFINITIONS['entityId'],
  get: getentityid,
  set: setentityid,
  has: hasentityid,
  clear: clearentityid,
  validate: validateentityid,
  describe: describeentityid,
  defaultValue: defaultentityid
});


function getbefore(record) {
  return record ? clone(record['before']) : undefined;
}

function setbefore(record, value) {
  if (!record) throw new TypeError('record is required');
  record['before'] = normalizeField('before', value);
  return record;
}

function hasbefore(record) {
  return Boolean(record && record['before'] !== undefined && record['before'] !== null && record['before'] !== '');
}

function clearbefore(record) {
  if (record) delete record['before'];
  return record;
}

function validatebefore(value) {
  const result = validatePayload({ 'before': value }, { partial: true });
  return result.errors.filter(error => error.field === 'before');
}

function describebefore() {
  return describeParameter('before');
}

function defaultbefore() {
  return createDefaultParameters()['before'];
}

const beforeParameter = Object.freeze({
  name: 'before',
  definition: PARAMETER_DEFINITIONS['before'],
  get: getbefore,
  set: setbefore,
  has: hasbefore,
  clear: clearbefore,
  validate: validatebefore,
  describe: describebefore,
  defaultValue: defaultbefore
});


function getafter(record) {
  return record ? clone(record['after']) : undefined;
}

function setafter(record, value) {
  if (!record) throw new TypeError('record is required');
  record['after'] = normalizeField('after', value);
  return record;
}

function hasafter(record) {
  return Boolean(record && record['after'] !== undefined && record['after'] !== null && record['after'] !== '');
}

function clearafter(record) {
  if (record) delete record['after'];
  return record;
}

function validateafter(value) {
  const result = validatePayload({ 'after': value }, { partial: true });
  return result.errors.filter(error => error.field === 'after');
}

function describeafter() {
  return describeParameter('after');
}

function defaultafter() {
  return createDefaultParameters()['after'];
}

const afterParameter = Object.freeze({
  name: 'after',
  definition: PARAMETER_DEFINITIONS['after'],
  get: getafter,
  set: setafter,
  has: hasafter,
  clear: clearafter,
  validate: validateafter,
  describe: describeafter,
  defaultValue: defaultafter
});


function getipaddress(record) {
  return record ? clone(record['ipAddress']) : undefined;
}

function setipaddress(record, value) {
  if (!record) throw new TypeError('record is required');
  record['ipAddress'] = normalizeField('ipAddress', value);
  return record;
}

function hasipaddress(record) {
  return Boolean(record && record['ipAddress'] !== undefined && record['ipAddress'] !== null && record['ipAddress'] !== '');
}

function clearipaddress(record) {
  if (record) delete record['ipAddress'];
  return record;
}

function validateipaddress(value) {
  const result = validatePayload({ 'ipAddress': value }, { partial: true });
  return result.errors.filter(error => error.field === 'ipAddress');
}

function describeipaddress() {
  return describeParameter('ipAddress');
}

function defaultipaddress() {
  return createDefaultParameters()['ipAddress'];
}

const ipaddressParameter = Object.freeze({
  name: 'ipAddress',
  definition: PARAMETER_DEFINITIONS['ipAddress'],
  get: getipaddress,
  set: setipaddress,
  has: hasipaddress,
  clear: clearipaddress,
  validate: validateipaddress,
  describe: describeipaddress,
  defaultValue: defaultipaddress
});


function getuseragent(record) {
  return record ? clone(record['userAgent']) : undefined;
}

function setuseragent(record, value) {
  if (!record) throw new TypeError('record is required');
  record['userAgent'] = normalizeField('userAgent', value);
  return record;
}

function hasuseragent(record) {
  return Boolean(record && record['userAgent'] !== undefined && record['userAgent'] !== null && record['userAgent'] !== '');
}

function clearuseragent(record) {
  if (record) delete record['userAgent'];
  return record;
}

function validateuseragent(value) {
  const result = validatePayload({ 'userAgent': value }, { partial: true });
  return result.errors.filter(error => error.field === 'userAgent');
}

function describeuseragent() {
  return describeParameter('userAgent');
}

function defaultuseragent() {
  return createDefaultParameters()['userAgent'];
}

const useragentParameter = Object.freeze({
  name: 'userAgent',
  definition: PARAMETER_DEFINITIONS['userAgent'],
  get: getuseragent,
  set: setuseragent,
  has: hasuseragent,
  clear: clearuseragent,
  validate: validateuseragent,
  describe: describeuseragent,
  defaultValue: defaultuseragent
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
  adminid: adminidParameter,
  action: actionParameter,
  entitytype: entitytypeParameter,
  entityid: entityidParameter,
  before: beforeParameter,
  after: afterParameter,
  ipaddress: ipaddressParameter,
  useragent: useragentParameter,
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
  const value = normalizeField('adminId', input['adminId']);
  const definition = PARAMETER_DEFINITIONS['adminId'];
  return {
    field: 'adminId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'adminId' : 'adminId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
  const value = normalizeField('action', input['action']);
  const definition = PARAMETER_DEFINITIONS['action'];
  return {
    field: 'action',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'action' : 'action')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('entityType', input['entityType']);
  const definition = PARAMETER_DEFINITIONS['entityType'];
  return {
    field: 'entityType',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'entityType' : 'entityType')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('entityId', input['entityId']);
  const definition = PARAMETER_DEFINITIONS['entityId'];
  return {
    field: 'entityId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'entityId' : 'entityId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('before', input['before']);
  const definition = PARAMETER_DEFINITIONS['before'];
  return {
    field: 'before',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'before' : 'before')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('after', input['after']);
  const definition = PARAMETER_DEFINITIONS['after'];
  return {
    field: 'after',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'after' : 'after')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('ipAddress', input['ipAddress']);
  const definition = PARAMETER_DEFINITIONS['ipAddress'];
  return {
    field: 'ipAddress',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'ipAddress' : 'ipAddress')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('userAgent', input['userAgent']);
  const definition = PARAMETER_DEFINITIONS['userAgent'];
  return {
    field: 'userAgent',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'userAgent' : 'userAgent')]: value }, { partial: true }).valid
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
