
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'analyticsEvents';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'sessionId', 'event', 'entityType', 'entityId', 'properties', 'source', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sessionId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'event': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'entityType': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'entityId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'properties': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'source': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getsessionid(record) {
  return record ? clone(record['sessionId']) : undefined;
}

function setsessionid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['sessionId'] = normalizeField('sessionId', value);
  return record;
}

function hassessionid(record) {
  return Boolean(record && record['sessionId'] !== undefined && record['sessionId'] !== null && record['sessionId'] !== '');
}

function clearsessionid(record) {
  if (record) delete record['sessionId'];
  return record;
}

function validatesessionid(value) {
  const result = validatePayload({ 'sessionId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'sessionId');
}

function describesessionid() {
  return describeParameter('sessionId');
}

function defaultsessionid() {
  return createDefaultParameters()['sessionId'];
}

const sessionidParameter = Object.freeze({
  name: 'sessionId',
  definition: PARAMETER_DEFINITIONS['sessionId'],
  get: getsessionid,
  set: setsessionid,
  has: hassessionid,
  clear: clearsessionid,
  validate: validatesessionid,
  describe: describesessionid,
  defaultValue: defaultsessionid
});


function getevent(record) {
  return record ? clone(record['event']) : undefined;
}

function setevent(record, value) {
  if (!record) throw new TypeError('record is required');
  record['event'] = normalizeField('event', value);
  return record;
}

function hasevent(record) {
  return Boolean(record && record['event'] !== undefined && record['event'] !== null && record['event'] !== '');
}

function clearevent(record) {
  if (record) delete record['event'];
  return record;
}

function validateevent(value) {
  const result = validatePayload({ 'event': value }, { partial: true });
  return result.errors.filter(error => error.field === 'event');
}

function describeevent() {
  return describeParameter('event');
}

function defaultevent() {
  return createDefaultParameters()['event'];
}

const eventParameter = Object.freeze({
  name: 'event',
  definition: PARAMETER_DEFINITIONS['event'],
  get: getevent,
  set: setevent,
  has: hasevent,
  clear: clearevent,
  validate: validateevent,
  describe: describeevent,
  defaultValue: defaultevent
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


function getproperties(record) {
  return record ? clone(record['properties']) : undefined;
}

function setproperties(record, value) {
  if (!record) throw new TypeError('record is required');
  record['properties'] = normalizeField('properties', value);
  return record;
}

function hasproperties(record) {
  return Boolean(record && record['properties'] !== undefined && record['properties'] !== null && record['properties'] !== '');
}

function clearproperties(record) {
  if (record) delete record['properties'];
  return record;
}

function validateproperties(value) {
  const result = validatePayload({ 'properties': value }, { partial: true });
  return result.errors.filter(error => error.field === 'properties');
}

function describeproperties() {
  return describeParameter('properties');
}

function defaultproperties() {
  return createDefaultParameters()['properties'];
}

const propertiesParameter = Object.freeze({
  name: 'properties',
  definition: PARAMETER_DEFINITIONS['properties'],
  get: getproperties,
  set: setproperties,
  has: hasproperties,
  clear: clearproperties,
  validate: validateproperties,
  describe: describeproperties,
  defaultValue: defaultproperties
});


function getsource(record) {
  return record ? clone(record['source']) : undefined;
}

function setsource(record, value) {
  if (!record) throw new TypeError('record is required');
  record['source'] = normalizeField('source', value);
  return record;
}

function hassource(record) {
  return Boolean(record && record['source'] !== undefined && record['source'] !== null && record['source'] !== '');
}

function clearsource(record) {
  if (record) delete record['source'];
  return record;
}

function validatesource(value) {
  const result = validatePayload({ 'source': value }, { partial: true });
  return result.errors.filter(error => error.field === 'source');
}

function describesource() {
  return describeParameter('source');
}

function defaultsource() {
  return createDefaultParameters()['source'];
}

const sourceParameter = Object.freeze({
  name: 'source',
  definition: PARAMETER_DEFINITIONS['source'],
  get: getsource,
  set: setsource,
  has: hassource,
  clear: clearsource,
  validate: validatesource,
  describe: describesource,
  defaultValue: defaultsource
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
  userid: useridParameter,
  sessionid: sessionidParameter,
  event: eventParameter,
  entitytype: entitytypeParameter,
  entityid: entityidParameter,
  properties: propertiesParameter,
  source: sourceParameter,
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
  const value = normalizeField('sessionId', input['sessionId']);
  const definition = PARAMETER_DEFINITIONS['sessionId'];
  return {
    field: 'sessionId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'sessionId' : 'sessionId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('event', input['event']);
  const definition = PARAMETER_DEFINITIONS['event'];
  return {
    field: 'event',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'event' : 'event')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
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

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
  const value = normalizeField('properties', input['properties']);
  const definition = PARAMETER_DEFINITIONS['properties'];
  return {
    field: 'properties',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'properties' : 'properties')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('source', input['source']);
  const definition = PARAMETER_DEFINITIONS['source'];
  return {
    field: 'source',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'source' : 'source')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
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
