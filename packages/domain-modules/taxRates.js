
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'taxRates';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'name', 'country', 'state', 'postalCode', 'rate', 'taxClass', 'inclusive', 'active', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'name': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'country': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'state': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'postalCode': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'rate': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'taxClass': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'inclusive': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
  'active': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
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


function getname(record) {
  return record ? clone(record['name']) : undefined;
}

function setname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['name'] = normalizeField('name', value);
  return record;
}

function hasname(record) {
  return Boolean(record && record['name'] !== undefined && record['name'] !== null && record['name'] !== '');
}

function clearname(record) {
  if (record) delete record['name'];
  return record;
}

function validatename(value) {
  const result = validatePayload({ 'name': value }, { partial: true });
  return result.errors.filter(error => error.field === 'name');
}

function describename() {
  return describeParameter('name');
}

function defaultname() {
  return createDefaultParameters()['name'];
}

const nameParameter = Object.freeze({
  name: 'name',
  definition: PARAMETER_DEFINITIONS['name'],
  get: getname,
  set: setname,
  has: hasname,
  clear: clearname,
  validate: validatename,
  describe: describename,
  defaultValue: defaultname
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


function getrate(record) {
  return record ? clone(record['rate']) : undefined;
}

function setrate(record, value) {
  if (!record) throw new TypeError('record is required');
  record['rate'] = normalizeField('rate', value);
  return record;
}

function hasrate(record) {
  return Boolean(record && record['rate'] !== undefined && record['rate'] !== null && record['rate'] !== '');
}

function clearrate(record) {
  if (record) delete record['rate'];
  return record;
}

function validaterate(value) {
  const result = validatePayload({ 'rate': value }, { partial: true });
  return result.errors.filter(error => error.field === 'rate');
}

function describerate() {
  return describeParameter('rate');
}

function defaultrate() {
  return createDefaultParameters()['rate'];
}

const rateParameter = Object.freeze({
  name: 'rate',
  definition: PARAMETER_DEFINITIONS['rate'],
  get: getrate,
  set: setrate,
  has: hasrate,
  clear: clearrate,
  validate: validaterate,
  describe: describerate,
  defaultValue: defaultrate
});


function gettaxclass(record) {
  return record ? clone(record['taxClass']) : undefined;
}

function settaxclass(record, value) {
  if (!record) throw new TypeError('record is required');
  record['taxClass'] = normalizeField('taxClass', value);
  return record;
}

function hastaxclass(record) {
  return Boolean(record && record['taxClass'] !== undefined && record['taxClass'] !== null && record['taxClass'] !== '');
}

function cleartaxclass(record) {
  if (record) delete record['taxClass'];
  return record;
}

function validatetaxclass(value) {
  const result = validatePayload({ 'taxClass': value }, { partial: true });
  return result.errors.filter(error => error.field === 'taxClass');
}

function describetaxclass() {
  return describeParameter('taxClass');
}

function defaulttaxclass() {
  return createDefaultParameters()['taxClass'];
}

const taxclassParameter = Object.freeze({
  name: 'taxClass',
  definition: PARAMETER_DEFINITIONS['taxClass'],
  get: gettaxclass,
  set: settaxclass,
  has: hastaxclass,
  clear: cleartaxclass,
  validate: validatetaxclass,
  describe: describetaxclass,
  defaultValue: defaulttaxclass
});


function getinclusive(record) {
  return record ? clone(record['inclusive']) : undefined;
}

function setinclusive(record, value) {
  if (!record) throw new TypeError('record is required');
  record['inclusive'] = normalizeField('inclusive', value);
  return record;
}

function hasinclusive(record) {
  return Boolean(record && record['inclusive'] !== undefined && record['inclusive'] !== null && record['inclusive'] !== '');
}

function clearinclusive(record) {
  if (record) delete record['inclusive'];
  return record;
}

function validateinclusive(value) {
  const result = validatePayload({ 'inclusive': value }, { partial: true });
  return result.errors.filter(error => error.field === 'inclusive');
}

function describeinclusive() {
  return describeParameter('inclusive');
}

function defaultinclusive() {
  return createDefaultParameters()['inclusive'];
}

const inclusiveParameter = Object.freeze({
  name: 'inclusive',
  definition: PARAMETER_DEFINITIONS['inclusive'],
  get: getinclusive,
  set: setinclusive,
  has: hasinclusive,
  clear: clearinclusive,
  validate: validateinclusive,
  describe: describeinclusive,
  defaultValue: defaultinclusive
});


function getactive(record) {
  return record ? clone(record['active']) : undefined;
}

function setactive(record, value) {
  if (!record) throw new TypeError('record is required');
  record['active'] = normalizeField('active', value);
  return record;
}

function hasactive(record) {
  return Boolean(record && record['active'] !== undefined && record['active'] !== null && record['active'] !== '');
}

function clearactive(record) {
  if (record) delete record['active'];
  return record;
}

function validateactive(value) {
  const result = validatePayload({ 'active': value }, { partial: true });
  return result.errors.filter(error => error.field === 'active');
}

function describeactive() {
  return describeParameter('active');
}

function defaultactive() {
  return createDefaultParameters()['active'];
}

const activeParameter = Object.freeze({
  name: 'active',
  definition: PARAMETER_DEFINITIONS['active'],
  get: getactive,
  set: setactive,
  has: hasactive,
  clear: clearactive,
  validate: validateactive,
  describe: describeactive,
  defaultValue: defaultactive
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
  name: nameParameter,
  country: countryParameter,
  state: stateParameter,
  postalcode: postalcodeParameter,
  rate: rateParameter,
  taxclass: taxclassParameter,
  inclusive: inclusiveParameter,
  active: activeParameter,
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
  const value = normalizeField('name', input['name']);
  const definition = PARAMETER_DEFINITIONS['name'];
  return {
    field: 'name',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'name' : 'name')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
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

function parameterPolicy_3(input = {}) {
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

function parameterPolicy_4(input = {}) {
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

function parameterPolicy_5(input = {}) {
  const value = normalizeField('rate', input['rate']);
  const definition = PARAMETER_DEFINITIONS['rate'];
  return {
    field: 'rate',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'rate' : 'rate')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('taxClass', input['taxClass']);
  const definition = PARAMETER_DEFINITIONS['taxClass'];
  return {
    field: 'taxClass',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'taxClass' : 'taxClass')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('inclusive', input['inclusive']);
  const definition = PARAMETER_DEFINITIONS['inclusive'];
  return {
    field: 'inclusive',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'inclusive' : 'inclusive')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('active', input['active']);
  const definition = PARAMETER_DEFINITIONS['active'];
  return {
    field: 'active',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'active' : 'active')]: value }, { partial: true }).valid
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

function parameterPolicy_10(input = {}) {
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
