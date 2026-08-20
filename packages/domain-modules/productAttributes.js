
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'productAttributes';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'name', 'type', 'unit', 'required', 'filterable', 'searchable', 'options', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'name': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'unit': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'required': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
  'filterable': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
  'searchable': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
  'options': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getunit(record) {
  return record ? clone(record['unit']) : undefined;
}

function setunit(record, value) {
  if (!record) throw new TypeError('record is required');
  record['unit'] = normalizeField('unit', value);
  return record;
}

function hasunit(record) {
  return Boolean(record && record['unit'] !== undefined && record['unit'] !== null && record['unit'] !== '');
}

function clearunit(record) {
  if (record) delete record['unit'];
  return record;
}

function validateunit(value) {
  const result = validatePayload({ 'unit': value }, { partial: true });
  return result.errors.filter(error => error.field === 'unit');
}

function describeunit() {
  return describeParameter('unit');
}

function defaultunit() {
  return createDefaultParameters()['unit'];
}

const unitParameter = Object.freeze({
  name: 'unit',
  definition: PARAMETER_DEFINITIONS['unit'],
  get: getunit,
  set: setunit,
  has: hasunit,
  clear: clearunit,
  validate: validateunit,
  describe: describeunit,
  defaultValue: defaultunit
});


function getrequired(record) {
  return record ? clone(record['required']) : undefined;
}

function setrequired(record, value) {
  if (!record) throw new TypeError('record is required');
  record['required'] = normalizeField('required', value);
  return record;
}

function hasrequired(record) {
  return Boolean(record && record['required'] !== undefined && record['required'] !== null && record['required'] !== '');
}

function clearrequired(record) {
  if (record) delete record['required'];
  return record;
}

function validaterequired(value) {
  const result = validatePayload({ 'required': value }, { partial: true });
  return result.errors.filter(error => error.field === 'required');
}

function describerequired() {
  return describeParameter('required');
}

function defaultrequired() {
  return createDefaultParameters()['required'];
}

const requiredParameter = Object.freeze({
  name: 'required',
  definition: PARAMETER_DEFINITIONS['required'],
  get: getrequired,
  set: setrequired,
  has: hasrequired,
  clear: clearrequired,
  validate: validaterequired,
  describe: describerequired,
  defaultValue: defaultrequired
});


function getfilterable(record) {
  return record ? clone(record['filterable']) : undefined;
}

function setfilterable(record, value) {
  if (!record) throw new TypeError('record is required');
  record['filterable'] = normalizeField('filterable', value);
  return record;
}

function hasfilterable(record) {
  return Boolean(record && record['filterable'] !== undefined && record['filterable'] !== null && record['filterable'] !== '');
}

function clearfilterable(record) {
  if (record) delete record['filterable'];
  return record;
}

function validatefilterable(value) {
  const result = validatePayload({ 'filterable': value }, { partial: true });
  return result.errors.filter(error => error.field === 'filterable');
}

function describefilterable() {
  return describeParameter('filterable');
}

function defaultfilterable() {
  return createDefaultParameters()['filterable'];
}

const filterableParameter = Object.freeze({
  name: 'filterable',
  definition: PARAMETER_DEFINITIONS['filterable'],
  get: getfilterable,
  set: setfilterable,
  has: hasfilterable,
  clear: clearfilterable,
  validate: validatefilterable,
  describe: describefilterable,
  defaultValue: defaultfilterable
});


function getsearchable(record) {
  return record ? clone(record['searchable']) : undefined;
}

function setsearchable(record, value) {
  if (!record) throw new TypeError('record is required');
  record['searchable'] = normalizeField('searchable', value);
  return record;
}

function hassearchable(record) {
  return Boolean(record && record['searchable'] !== undefined && record['searchable'] !== null && record['searchable'] !== '');
}

function clearsearchable(record) {
  if (record) delete record['searchable'];
  return record;
}

function validatesearchable(value) {
  const result = validatePayload({ 'searchable': value }, { partial: true });
  return result.errors.filter(error => error.field === 'searchable');
}

function describesearchable() {
  return describeParameter('searchable');
}

function defaultsearchable() {
  return createDefaultParameters()['searchable'];
}

const searchableParameter = Object.freeze({
  name: 'searchable',
  definition: PARAMETER_DEFINITIONS['searchable'],
  get: getsearchable,
  set: setsearchable,
  has: hassearchable,
  clear: clearsearchable,
  validate: validatesearchable,
  describe: describesearchable,
  defaultValue: defaultsearchable
});


function getoptions(record) {
  return record ? clone(record['options']) : undefined;
}

function setoptions(record, value) {
  if (!record) throw new TypeError('record is required');
  record['options'] = normalizeField('options', value);
  return record;
}

function hasoptions(record) {
  return Boolean(record && record['options'] !== undefined && record['options'] !== null && record['options'] !== '');
}

function clearoptions(record) {
  if (record) delete record['options'];
  return record;
}

function validateoptions(value) {
  const result = validatePayload({ 'options': value }, { partial: true });
  return result.errors.filter(error => error.field === 'options');
}

function describeoptions() {
  return describeParameter('options');
}

function defaultoptions() {
  return createDefaultParameters()['options'];
}

const optionsParameter = Object.freeze({
  name: 'options',
  definition: PARAMETER_DEFINITIONS['options'],
  get: getoptions,
  set: setoptions,
  has: hasoptions,
  clear: clearoptions,
  validate: validateoptions,
  describe: describeoptions,
  defaultValue: defaultoptions
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
  type: typeParameter,
  unit: unitParameter,
  required: requiredParameter,
  filterable: filterableParameter,
  searchable: searchableParameter,
  options: optionsParameter,
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
  const value = normalizeField('unit', input['unit']);
  const definition = PARAMETER_DEFINITIONS['unit'];
  return {
    field: 'unit',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'unit' : 'unit')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('required', input['required']);
  const definition = PARAMETER_DEFINITIONS['required'];
  return {
    field: 'required',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'required' : 'required')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('filterable', input['filterable']);
  const definition = PARAMETER_DEFINITIONS['filterable'];
  return {
    field: 'filterable',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'filterable' : 'filterable')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('searchable', input['searchable']);
  const definition = PARAMETER_DEFINITIONS['searchable'];
  return {
    field: 'searchable',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'searchable' : 'searchable')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('options', input['options']);
  const definition = PARAMETER_DEFINITIONS['options'];
  return {
    field: 'options',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'options' : 'options')]: value }, { partial: true }).valid
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

function parameterPolicy_9(input = {}) {
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
