
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'loyaltyTransactions';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'accountId', 'type', 'points', 'referenceType', 'referenceId', 'description', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'accountId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'points': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'referenceType': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'referenceId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'description': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getaccountid(record) {
  return record ? clone(record['accountId']) : undefined;
}

function setaccountid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['accountId'] = normalizeField('accountId', value);
  return record;
}

function hasaccountid(record) {
  return Boolean(record && record['accountId'] !== undefined && record['accountId'] !== null && record['accountId'] !== '');
}

function clearaccountid(record) {
  if (record) delete record['accountId'];
  return record;
}

function validateaccountid(value) {
  const result = validatePayload({ 'accountId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'accountId');
}

function describeaccountid() {
  return describeParameter('accountId');
}

function defaultaccountid() {
  return createDefaultParameters()['accountId'];
}

const accountidParameter = Object.freeze({
  name: 'accountId',
  definition: PARAMETER_DEFINITIONS['accountId'],
  get: getaccountid,
  set: setaccountid,
  has: hasaccountid,
  clear: clearaccountid,
  validate: validateaccountid,
  describe: describeaccountid,
  defaultValue: defaultaccountid
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


function getpoints(record) {
  return record ? clone(record['points']) : undefined;
}

function setpoints(record, value) {
  if (!record) throw new TypeError('record is required');
  record['points'] = normalizeField('points', value);
  return record;
}

function haspoints(record) {
  return Boolean(record && record['points'] !== undefined && record['points'] !== null && record['points'] !== '');
}

function clearpoints(record) {
  if (record) delete record['points'];
  return record;
}

function validatepoints(value) {
  const result = validatePayload({ 'points': value }, { partial: true });
  return result.errors.filter(error => error.field === 'points');
}

function describepoints() {
  return describeParameter('points');
}

function defaultpoints() {
  return createDefaultParameters()['points'];
}

const pointsParameter = Object.freeze({
  name: 'points',
  definition: PARAMETER_DEFINITIONS['points'],
  get: getpoints,
  set: setpoints,
  has: haspoints,
  clear: clearpoints,
  validate: validatepoints,
  describe: describepoints,
  defaultValue: defaultpoints
});


function getreferencetype(record) {
  return record ? clone(record['referenceType']) : undefined;
}

function setreferencetype(record, value) {
  if (!record) throw new TypeError('record is required');
  record['referenceType'] = normalizeField('referenceType', value);
  return record;
}

function hasreferencetype(record) {
  return Boolean(record && record['referenceType'] !== undefined && record['referenceType'] !== null && record['referenceType'] !== '');
}

function clearreferencetype(record) {
  if (record) delete record['referenceType'];
  return record;
}

function validatereferencetype(value) {
  const result = validatePayload({ 'referenceType': value }, { partial: true });
  return result.errors.filter(error => error.field === 'referenceType');
}

function describereferencetype() {
  return describeParameter('referenceType');
}

function defaultreferencetype() {
  return createDefaultParameters()['referenceType'];
}

const referencetypeParameter = Object.freeze({
  name: 'referenceType',
  definition: PARAMETER_DEFINITIONS['referenceType'],
  get: getreferencetype,
  set: setreferencetype,
  has: hasreferencetype,
  clear: clearreferencetype,
  validate: validatereferencetype,
  describe: describereferencetype,
  defaultValue: defaultreferencetype
});


function getreferenceid(record) {
  return record ? clone(record['referenceId']) : undefined;
}

function setreferenceid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['referenceId'] = normalizeField('referenceId', value);
  return record;
}

function hasreferenceid(record) {
  return Boolean(record && record['referenceId'] !== undefined && record['referenceId'] !== null && record['referenceId'] !== '');
}

function clearreferenceid(record) {
  if (record) delete record['referenceId'];
  return record;
}

function validatereferenceid(value) {
  const result = validatePayload({ 'referenceId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'referenceId');
}

function describereferenceid() {
  return describeParameter('referenceId');
}

function defaultreferenceid() {
  return createDefaultParameters()['referenceId'];
}

const referenceidParameter = Object.freeze({
  name: 'referenceId',
  definition: PARAMETER_DEFINITIONS['referenceId'],
  get: getreferenceid,
  set: setreferenceid,
  has: hasreferenceid,
  clear: clearreferenceid,
  validate: validatereferenceid,
  describe: describereferenceid,
  defaultValue: defaultreferenceid
});


function getdescription(record) {
  return record ? clone(record['description']) : undefined;
}

function setdescription(record, value) {
  if (!record) throw new TypeError('record is required');
  record['description'] = normalizeField('description', value);
  return record;
}

function hasdescription(record) {
  return Boolean(record && record['description'] !== undefined && record['description'] !== null && record['description'] !== '');
}

function cleardescription(record) {
  if (record) delete record['description'];
  return record;
}

function validatedescription(value) {
  const result = validatePayload({ 'description': value }, { partial: true });
  return result.errors.filter(error => error.field === 'description');
}

function describedescription() {
  return describeParameter('description');
}

function defaultdescription() {
  return createDefaultParameters()['description'];
}

const descriptionParameter = Object.freeze({
  name: 'description',
  definition: PARAMETER_DEFINITIONS['description'],
  get: getdescription,
  set: setdescription,
  has: hasdescription,
  clear: cleardescription,
  validate: validatedescription,
  describe: describedescription,
  defaultValue: defaultdescription
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
  accountid: accountidParameter,
  type: typeParameter,
  points: pointsParameter,
  referencetype: referencetypeParameter,
  referenceid: referenceidParameter,
  description: descriptionParameter,
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
  const value = normalizeField('accountId', input['accountId']);
  const definition = PARAMETER_DEFINITIONS['accountId'];
  return {
    field: 'accountId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'accountId' : 'accountId')]: value }, { partial: true }).valid
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
  const value = normalizeField('points', input['points']);
  const definition = PARAMETER_DEFINITIONS['points'];
  return {
    field: 'points',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'points' : 'points')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('referenceType', input['referenceType']);
  const definition = PARAMETER_DEFINITIONS['referenceType'];
  return {
    field: 'referenceType',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'referenceType' : 'referenceType')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('referenceId', input['referenceId']);
  const definition = PARAMETER_DEFINITIONS['referenceId'];
  return {
    field: 'referenceId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'referenceId' : 'referenceId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('description', input['description']);
  const definition = PARAMETER_DEFINITIONS['description'];
  return {
    field: 'description',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'description' : 'description')]: value }, { partial: true }).valid
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
