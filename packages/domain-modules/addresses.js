
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'addresses';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'type', 'fullName', 'phone', 'line1', 'line2', 'city', 'state', 'country', 'postalCode', 'landmark', 'isDefault', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'fullName': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'phone': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'line1': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'line2': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'city': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'state': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'country': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'postalCode': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'landmark': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'isDefault': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
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


function getfullname(record) {
  return record ? clone(record['fullName']) : undefined;
}

function setfullname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['fullName'] = normalizeField('fullName', value);
  return record;
}

function hasfullname(record) {
  return Boolean(record && record['fullName'] !== undefined && record['fullName'] !== null && record['fullName'] !== '');
}

function clearfullname(record) {
  if (record) delete record['fullName'];
  return record;
}

function validatefullname(value) {
  const result = validatePayload({ 'fullName': value }, { partial: true });
  return result.errors.filter(error => error.field === 'fullName');
}

function describefullname() {
  return describeParameter('fullName');
}

function defaultfullname() {
  return createDefaultParameters()['fullName'];
}

const fullnameParameter = Object.freeze({
  name: 'fullName',
  definition: PARAMETER_DEFINITIONS['fullName'],
  get: getfullname,
  set: setfullname,
  has: hasfullname,
  clear: clearfullname,
  validate: validatefullname,
  describe: describefullname,
  defaultValue: defaultfullname
});


function getphone(record) {
  return record ? clone(record['phone']) : undefined;
}

function setphone(record, value) {
  if (!record) throw new TypeError('record is required');
  record['phone'] = normalizeField('phone', value);
  return record;
}

function hasphone(record) {
  return Boolean(record && record['phone'] !== undefined && record['phone'] !== null && record['phone'] !== '');
}

function clearphone(record) {
  if (record) delete record['phone'];
  return record;
}

function validatephone(value) {
  const result = validatePayload({ 'phone': value }, { partial: true });
  return result.errors.filter(error => error.field === 'phone');
}

function describephone() {
  return describeParameter('phone');
}

function defaultphone() {
  return createDefaultParameters()['phone'];
}

const phoneParameter = Object.freeze({
  name: 'phone',
  definition: PARAMETER_DEFINITIONS['phone'],
  get: getphone,
  set: setphone,
  has: hasphone,
  clear: clearphone,
  validate: validatephone,
  describe: describephone,
  defaultValue: defaultphone
});


function getline1(record) {
  return record ? clone(record['line1']) : undefined;
}

function setline1(record, value) {
  if (!record) throw new TypeError('record is required');
  record['line1'] = normalizeField('line1', value);
  return record;
}

function hasline1(record) {
  return Boolean(record && record['line1'] !== undefined && record['line1'] !== null && record['line1'] !== '');
}

function clearline1(record) {
  if (record) delete record['line1'];
  return record;
}

function validateline1(value) {
  const result = validatePayload({ 'line1': value }, { partial: true });
  return result.errors.filter(error => error.field === 'line1');
}

function describeline1() {
  return describeParameter('line1');
}

function defaultline1() {
  return createDefaultParameters()['line1'];
}

const line1Parameter = Object.freeze({
  name: 'line1',
  definition: PARAMETER_DEFINITIONS['line1'],
  get: getline1,
  set: setline1,
  has: hasline1,
  clear: clearline1,
  validate: validateline1,
  describe: describeline1,
  defaultValue: defaultline1
});


function getline2(record) {
  return record ? clone(record['line2']) : undefined;
}

function setline2(record, value) {
  if (!record) throw new TypeError('record is required');
  record['line2'] = normalizeField('line2', value);
  return record;
}

function hasline2(record) {
  return Boolean(record && record['line2'] !== undefined && record['line2'] !== null && record['line2'] !== '');
}

function clearline2(record) {
  if (record) delete record['line2'];
  return record;
}

function validateline2(value) {
  const result = validatePayload({ 'line2': value }, { partial: true });
  return result.errors.filter(error => error.field === 'line2');
}

function describeline2() {
  return describeParameter('line2');
}

function defaultline2() {
  return createDefaultParameters()['line2'];
}

const line2Parameter = Object.freeze({
  name: 'line2',
  definition: PARAMETER_DEFINITIONS['line2'],
  get: getline2,
  set: setline2,
  has: hasline2,
  clear: clearline2,
  validate: validateline2,
  describe: describeline2,
  defaultValue: defaultline2
});


function getcity(record) {
  return record ? clone(record['city']) : undefined;
}

function setcity(record, value) {
  if (!record) throw new TypeError('record is required');
  record['city'] = normalizeField('city', value);
  return record;
}

function hascity(record) {
  return Boolean(record && record['city'] !== undefined && record['city'] !== null && record['city'] !== '');
}

function clearcity(record) {
  if (record) delete record['city'];
  return record;
}

function validatecity(value) {
  const result = validatePayload({ 'city': value }, { partial: true });
  return result.errors.filter(error => error.field === 'city');
}

function describecity() {
  return describeParameter('city');
}

function defaultcity() {
  return createDefaultParameters()['city'];
}

const cityParameter = Object.freeze({
  name: 'city',
  definition: PARAMETER_DEFINITIONS['city'],
  get: getcity,
  set: setcity,
  has: hascity,
  clear: clearcity,
  validate: validatecity,
  describe: describecity,
  defaultValue: defaultcity
});


function getstate(record) {
  return record ? clone(record['state']) : undefined;
}

function setstate(record, value) {
  if (!record) throw new TypeError('record is required');
  record['state'] = normalizeField('state', value);
  return record;
}

function hasstate(record) {
  return Boolean(record && record['state'] !== undefined && record['state'] !== null && record['state'] !== '');
}

function clearstate(record) {
  if (record) delete record['state'];
  return record;
}

function validatestate(value) {
  const result = validatePayload({ 'state': value }, { partial: true });
  return result.errors.filter(error => error.field === 'state');
}

function describestate() {
  return describeParameter('state');
}

function defaultstate() {
  return createDefaultParameters()['state'];
}

const stateParameter = Object.freeze({
  name: 'state',
  definition: PARAMETER_DEFINITIONS['state'],
  get: getstate,
  set: setstate,
  has: hasstate,
  clear: clearstate,
  validate: validatestate,
  describe: describestate,
  defaultValue: defaultstate
});


function getcountry(record) {
  return record ? clone(record['country']) : undefined;
}

function setcountry(record, value) {
  if (!record) throw new TypeError('record is required');
  record['country'] = normalizeField('country', value);
  return record;
}

function hascountry(record) {
  return Boolean(record && record['country'] !== undefined && record['country'] !== null && record['country'] !== '');
}

function clearcountry(record) {
  if (record) delete record['country'];
  return record;
}

function validatecountry(value) {
  const result = validatePayload({ 'country': value }, { partial: true });
  return result.errors.filter(error => error.field === 'country');
}

function describecountry() {
  return describeParameter('country');
}

function defaultcountry() {
  return createDefaultParameters()['country'];
}

const countryParameter = Object.freeze({
  name: 'country',
  definition: PARAMETER_DEFINITIONS['country'],
  get: getcountry,
  set: setcountry,
  has: hascountry,
  clear: clearcountry,
  validate: validatecountry,
  describe: describecountry,
  defaultValue: defaultcountry
});


function getpostalcode(record) {
  return record ? clone(record['postalCode']) : undefined;
}

function setpostalcode(record, value) {
  if (!record) throw new TypeError('record is required');
  record['postalCode'] = normalizeField('postalCode', value);
  return record;
}

function haspostalcode(record) {
  return Boolean(record && record['postalCode'] !== undefined && record['postalCode'] !== null && record['postalCode'] !== '');
}

function clearpostalcode(record) {
  if (record) delete record['postalCode'];
  return record;
}

function validatepostalcode(value) {
  const result = validatePayload({ 'postalCode': value }, { partial: true });
  return result.errors.filter(error => error.field === 'postalCode');
}

function describepostalcode() {
  return describeParameter('postalCode');
}

function defaultpostalcode() {
  return createDefaultParameters()['postalCode'];
}

const postalcodeParameter = Object.freeze({
  name: 'postalCode',
  definition: PARAMETER_DEFINITIONS['postalCode'],
  get: getpostalcode,
  set: setpostalcode,
  has: haspostalcode,
  clear: clearpostalcode,
  validate: validatepostalcode,
  describe: describepostalcode,
  defaultValue: defaultpostalcode
});


function getlandmark(record) {
  return record ? clone(record['landmark']) : undefined;
}

function setlandmark(record, value) {
  if (!record) throw new TypeError('record is required');
  record['landmark'] = normalizeField('landmark', value);
  return record;
}

function haslandmark(record) {
  return Boolean(record && record['landmark'] !== undefined && record['landmark'] !== null && record['landmark'] !== '');
}

function clearlandmark(record) {
  if (record) delete record['landmark'];
  return record;
}

function validatelandmark(value) {
  const result = validatePayload({ 'landmark': value }, { partial: true });
  return result.errors.filter(error => error.field === 'landmark');
}

function describelandmark() {
  return describeParameter('landmark');
}

function defaultlandmark() {
  return createDefaultParameters()['landmark'];
}

const landmarkParameter = Object.freeze({
  name: 'landmark',
  definition: PARAMETER_DEFINITIONS['landmark'],
  get: getlandmark,
  set: setlandmark,
  has: haslandmark,
  clear: clearlandmark,
  validate: validatelandmark,
  describe: describelandmark,
  defaultValue: defaultlandmark
});


function getisdefault(record) {
  return record ? clone(record['isDefault']) : undefined;
}

function setisdefault(record, value) {
  if (!record) throw new TypeError('record is required');
  record['isDefault'] = normalizeField('isDefault', value);
  return record;
}

function hasisdefault(record) {
  return Boolean(record && record['isDefault'] !== undefined && record['isDefault'] !== null && record['isDefault'] !== '');
}

function clearisdefault(record) {
  if (record) delete record['isDefault'];
  return record;
}

function validateisdefault(value) {
  const result = validatePayload({ 'isDefault': value }, { partial: true });
  return result.errors.filter(error => error.field === 'isDefault');
}

function describeisdefault() {
  return describeParameter('isDefault');
}

function defaultisdefault() {
  return createDefaultParameters()['isDefault'];
}

const isdefaultParameter = Object.freeze({
  name: 'isDefault',
  definition: PARAMETER_DEFINITIONS['isDefault'],
  get: getisdefault,
  set: setisdefault,
  has: hasisdefault,
  clear: clearisdefault,
  validate: validateisdefault,
  describe: describeisdefault,
  defaultValue: defaultisdefault
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
  type: typeParameter,
  fullname: fullnameParameter,
  phone: phoneParameter,
  line1: line1Parameter,
  line2: line2Parameter,
  city: cityParameter,
  state: stateParameter,
  country: countryParameter,
  postalcode: postalcodeParameter,
  landmark: landmarkParameter,
  isdefault: isdefaultParameter,
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
  const value = normalizeField('fullName', input['fullName']);
  const definition = PARAMETER_DEFINITIONS['fullName'];
  return {
    field: 'fullName',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'fullName' : 'fullName')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('phone', input['phone']);
  const definition = PARAMETER_DEFINITIONS['phone'];
  return {
    field: 'phone',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'phone' : 'phone')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('line1', input['line1']);
  const definition = PARAMETER_DEFINITIONS['line1'];
  return {
    field: 'line1',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'line1' : 'line1')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('line2', input['line2']);
  const definition = PARAMETER_DEFINITIONS['line2'];
  return {
    field: 'line2',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'line2' : 'line2')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('city', input['city']);
  const definition = PARAMETER_DEFINITIONS['city'];
  return {
    field: 'city',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'city' : 'city')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('state', input['state']);
  const definition = PARAMETER_DEFINITIONS['state'];
  return {
    field: 'state',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'state' : 'state')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('country', input['country']);
  const definition = PARAMETER_DEFINITIONS['country'];
  return {
    field: 'country',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'country' : 'country')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('postalCode', input['postalCode']);
  const definition = PARAMETER_DEFINITIONS['postalCode'];
  return {
    field: 'postalCode',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'postalCode' : 'postalCode')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('landmark', input['landmark']);
  const definition = PARAMETER_DEFINITIONS['landmark'];
  return {
    field: 'landmark',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'landmark' : 'landmark')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_12(input = {}) {
  const value = normalizeField('isDefault', input['isDefault']);
  const definition = PARAMETER_DEFINITIONS['isDefault'];
  return {
    field: 'isDefault',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'isDefault' : 'isDefault')]: value }, { partial: true }).valid
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
