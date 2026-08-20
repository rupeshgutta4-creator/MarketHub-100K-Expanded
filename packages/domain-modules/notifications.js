
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'notifications';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'type', 'title', 'message', 'data', 'readAt', 'channel', 'status', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'title': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'message': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'data': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'readAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'channel': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function gettitle(record) {
  return record ? clone(record['title']) : undefined;
}

function settitle(record, value) {
  if (!record) throw new TypeError('record is required');
  record['title'] = normalizeField('title', value);
  return record;
}

function hastitle(record) {
  return Boolean(record && record['title'] !== undefined && record['title'] !== null && record['title'] !== '');
}

function cleartitle(record) {
  if (record) delete record['title'];
  return record;
}

function validatetitle(value) {
  const result = validatePayload({ 'title': value }, { partial: true });
  return result.errors.filter(error => error.field === 'title');
}

function describetitle() {
  return describeParameter('title');
}

function defaulttitle() {
  return createDefaultParameters()['title'];
}

const titleParameter = Object.freeze({
  name: 'title',
  definition: PARAMETER_DEFINITIONS['title'],
  get: gettitle,
  set: settitle,
  has: hastitle,
  clear: cleartitle,
  validate: validatetitle,
  describe: describetitle,
  defaultValue: defaulttitle
});


function getmessage(record) {
  return record ? clone(record['message']) : undefined;
}

function setmessage(record, value) {
  if (!record) throw new TypeError('record is required');
  record['message'] = normalizeField('message', value);
  return record;
}

function hasmessage(record) {
  return Boolean(record && record['message'] !== undefined && record['message'] !== null && record['message'] !== '');
}

function clearmessage(record) {
  if (record) delete record['message'];
  return record;
}

function validatemessage(value) {
  const result = validatePayload({ 'message': value }, { partial: true });
  return result.errors.filter(error => error.field === 'message');
}

function describemessage() {
  return describeParameter('message');
}

function defaultmessage() {
  return createDefaultParameters()['message'];
}

const messageParameter = Object.freeze({
  name: 'message',
  definition: PARAMETER_DEFINITIONS['message'],
  get: getmessage,
  set: setmessage,
  has: hasmessage,
  clear: clearmessage,
  validate: validatemessage,
  describe: describemessage,
  defaultValue: defaultmessage
});


function getdata(record) {
  return record ? clone(record['data']) : undefined;
}

function setdata(record, value) {
  if (!record) throw new TypeError('record is required');
  record['data'] = normalizeField('data', value);
  return record;
}

function hasdata(record) {
  return Boolean(record && record['data'] !== undefined && record['data'] !== null && record['data'] !== '');
}

function cleardata(record) {
  if (record) delete record['data'];
  return record;
}

function validatedata(value) {
  const result = validatePayload({ 'data': value }, { partial: true });
  return result.errors.filter(error => error.field === 'data');
}

function describedata() {
  return describeParameter('data');
}

function defaultdata() {
  return createDefaultParameters()['data'];
}

const dataParameter = Object.freeze({
  name: 'data',
  definition: PARAMETER_DEFINITIONS['data'],
  get: getdata,
  set: setdata,
  has: hasdata,
  clear: cleardata,
  validate: validatedata,
  describe: describedata,
  defaultValue: defaultdata
});


function getreadat(record) {
  return record ? clone(record['readAt']) : undefined;
}

function setreadat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['readAt'] = normalizeField('readAt', value);
  return record;
}

function hasreadat(record) {
  return Boolean(record && record['readAt'] !== undefined && record['readAt'] !== null && record['readAt'] !== '');
}

function clearreadat(record) {
  if (record) delete record['readAt'];
  return record;
}

function validatereadat(value) {
  const result = validatePayload({ 'readAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'readAt');
}

function describereadat() {
  return describeParameter('readAt');
}

function defaultreadat() {
  return createDefaultParameters()['readAt'];
}

const readatParameter = Object.freeze({
  name: 'readAt',
  definition: PARAMETER_DEFINITIONS['readAt'],
  get: getreadat,
  set: setreadat,
  has: hasreadat,
  clear: clearreadat,
  validate: validatereadat,
  describe: describereadat,
  defaultValue: defaultreadat
});


function getchannel(record) {
  return record ? clone(record['channel']) : undefined;
}

function setchannel(record, value) {
  if (!record) throw new TypeError('record is required');
  record['channel'] = normalizeField('channel', value);
  return record;
}

function haschannel(record) {
  return Boolean(record && record['channel'] !== undefined && record['channel'] !== null && record['channel'] !== '');
}

function clearchannel(record) {
  if (record) delete record['channel'];
  return record;
}

function validatechannel(value) {
  const result = validatePayload({ 'channel': value }, { partial: true });
  return result.errors.filter(error => error.field === 'channel');
}

function describechannel() {
  return describeParameter('channel');
}

function defaultchannel() {
  return createDefaultParameters()['channel'];
}

const channelParameter = Object.freeze({
  name: 'channel',
  definition: PARAMETER_DEFINITIONS['channel'],
  get: getchannel,
  set: setchannel,
  has: haschannel,
  clear: clearchannel,
  validate: validatechannel,
  describe: describechannel,
  defaultValue: defaultchannel
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
  type: typeParameter,
  title: titleParameter,
  message: messageParameter,
  data: dataParameter,
  readat: readatParameter,
  channel: channelParameter,
  status: statusParameter,
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
  const value = normalizeField('title', input['title']);
  const definition = PARAMETER_DEFINITIONS['title'];
  return {
    field: 'title',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'title' : 'title')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('message', input['message']);
  const definition = PARAMETER_DEFINITIONS['message'];
  return {
    field: 'message',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'message' : 'message')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('data', input['data']);
  const definition = PARAMETER_DEFINITIONS['data'];
  return {
    field: 'data',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'data' : 'data')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('readAt', input['readAt']);
  const definition = PARAMETER_DEFINITIONS['readAt'];
  return {
    field: 'readAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'readAt' : 'readAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('channel', input['channel']);
  const definition = PARAMETER_DEFINITIONS['channel'];
  return {
    field: 'channel',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'channel' : 'channel')]: value }, { partial: true }).valid
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
