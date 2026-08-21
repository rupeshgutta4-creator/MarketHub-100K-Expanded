
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'loyaltyAccounts';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'points', 'tier', 'lifetimePoints', 'availablePoints', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'points': Object.freeze({'type': 'number', 'required': true, 'nullable': false}),
  'tier': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'lifetimePoints': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'availablePoints': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
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


function getuserid(record) {
  return record ? clone(record['userId']) : undefined;
}

function setuserid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['userId'] = normalizeField('userId', value);
  return record;
}

function hasuserid(record) {
  return Boolean(record && record['userId'] !== undefined && record['userId'] !== null && record['userId'] !== '');
}

function clearuserid(record) {
  if (record) delete record['userId'];
  return record;
}

function validateuserid(value) {
  const result = validatePayload({ 'userId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'userId');
}

function describeuserid() {
  return describeParameter('userId');
}

function defaultuserid() {
  return createDefaultParameters()['userId'];
}

const useridParameter = Object.freeze({
  name: 'userId',
  definition: PARAMETER_DEFINITIONS['userId'],
  get: getuserid,
  set: setuserid,
  has: hasuserid,
  clear: clearuserid,
  validate: validateuserid,
  describe: describeuserid,
  defaultValue: defaultuserid
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


function gettier(record) {
  return record ? clone(record['tier']) : undefined;
}

function settier(record, value) {
  if (!record) throw new TypeError('record is required');
  record['tier'] = normalizeField('tier', value);
  return record;
}

function hastier(record) {
  return Boolean(record && record['tier'] !== undefined && record['tier'] !== null && record['tier'] !== '');
}

function cleartier(record) {
  if (record) delete record['tier'];
  return record;
}

function validatetier(value) {
  const result = validatePayload({ 'tier': value }, { partial: true });
  return result.errors.filter(error => error.field === 'tier');
}

function describetier() {
  return describeParameter('tier');
}

function defaulttier() {
  return createDefaultParameters()['tier'];
}

const tierParameter = Object.freeze({
  name: 'tier',
  definition: PARAMETER_DEFINITIONS['tier'],
  get: gettier,
  set: settier,
  has: hastier,
  clear: cleartier,
  validate: validatetier,
  describe: describetier,
  defaultValue: defaulttier
});


function getlifetimepoints(record) {
  return record ? clone(record['lifetimePoints']) : undefined;
}

function setlifetimepoints(record, value) {
  if (!record) throw new TypeError('record is required');
  record['lifetimePoints'] = normalizeField('lifetimePoints', value);
  return record;
}

function haslifetimepoints(record) {
  return Boolean(record && record['lifetimePoints'] !== undefined && record['lifetimePoints'] !== null && record['lifetimePoints'] !== '');
}

function clearlifetimepoints(record) {
  if (record) delete record['lifetimePoints'];
  return record;
}

function validatelifetimepoints(value) {
  const result = validatePayload({ 'lifetimePoints': value }, { partial: true });
  return result.errors.filter(error => error.field === 'lifetimePoints');
}

function describelifetimepoints() {
  return describeParameter('lifetimePoints');
}

function defaultlifetimepoints() {
  return createDefaultParameters()['lifetimePoints'];
}

const lifetimepointsParameter = Object.freeze({
  name: 'lifetimePoints',
  definition: PARAMETER_DEFINITIONS['lifetimePoints'],
  get: getlifetimepoints,
  set: setlifetimepoints,
  has: haslifetimepoints,
  clear: clearlifetimepoints,
  validate: validatelifetimepoints,
  describe: describelifetimepoints,
  defaultValue: defaultlifetimepoints
});


function getavailablepoints(record) {
  return record ? clone(record['availablePoints']) : undefined;
}

function setavailablepoints(record, value) {
  if (!record) throw new TypeError('record is required');
  record['availablePoints'] = normalizeField('availablePoints', value);
  return record;
}

function hasavailablepoints(record) {
  return Boolean(record && record['availablePoints'] !== undefined && record['availablePoints'] !== null && record['availablePoints'] !== '');
}

function clearavailablepoints(record) {
  if (record) delete record['availablePoints'];
  return record;
}

function validateavailablepoints(value) {
  const result = validatePayload({ 'availablePoints': value }, { partial: true });
  return result.errors.filter(error => error.field === 'availablePoints');
}

function describeavailablepoints() {
  return describeParameter('availablePoints');
}

function defaultavailablepoints() {
  return createDefaultParameters()['availablePoints'];
}

const availablepointsParameter = Object.freeze({
  name: 'availablePoints',
  definition: PARAMETER_DEFINITIONS['availablePoints'],
  get: getavailablepoints,
  set: setavailablepoints,
  has: hasavailablepoints,
  clear: clearavailablepoints,
  validate: validateavailablepoints,
  describe: describeavailablepoints,
  defaultValue: defaultavailablepoints
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
  userid: useridParameter,
  points: pointsParameter,
  tier: tierParameter,
  lifetimepoints: lifetimepointsParameter,
  availablepoints: availablepointsParameter,
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
  const value = normalizeField('userId', input['userId']);
  const definition = PARAMETER_DEFINITIONS['userId'];
  return {
    field: 'userId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'userId' : 'userId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
  const value = normalizeField('tier', input['tier']);
  const definition = PARAMETER_DEFINITIONS['tier'];
  return {
    field: 'tier',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'tier' : 'tier')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('lifetimePoints', input['lifetimePoints']);
  const definition = PARAMETER_DEFINITIONS['lifetimePoints'];
  return {
    field: 'lifetimePoints',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'lifetimePoints' : 'lifetimePoints')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('availablePoints', input['availablePoints']);
  const definition = PARAMETER_DEFINITIONS['availablePoints'];
  return {
    field: 'availablePoints',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'availablePoints' : 'availablePoints')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
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
