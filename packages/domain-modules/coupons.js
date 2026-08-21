
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'coupons';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'code', 'type', 'value', 'minOrder', 'maxDiscount', 'usageLimit', 'usageCount', 'perUserLimit', 'startsAt', 'endsAt', 'active', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'code': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'type': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'value': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'minOrder': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'maxDiscount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'usageLimit': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'usageCount': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'perUserLimit': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'startsAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'endsAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getcode(record) {
  return record ? clone(record['code']) : undefined;
}

function setcode(record, value) {
  if (!record) throw new TypeError('record is required');
  record['code'] = normalizeField('code', value);
  return record;
}

function hascode(record) {
  return Boolean(record && record['code'] !== undefined && record['code'] !== null && record['code'] !== '');
}

function clearcode(record) {
  if (record) delete record['code'];
  return record;
}

function validatecode(value) {
  const result = validatePayload({ 'code': value }, { partial: true });
  return result.errors.filter(error => error.field === 'code');
}

function describecode() {
  return describeParameter('code');
}

function defaultcode() {
  return createDefaultParameters()['code'];
}

const codeParameter = Object.freeze({
  name: 'code',
  definition: PARAMETER_DEFINITIONS['code'],
  get: getcode,
  set: setcode,
  has: hascode,
  clear: clearcode,
  validate: validatecode,
  describe: describecode,
  defaultValue: defaultcode
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


function getvalue(record) {
  return record ? clone(record['value']) : undefined;
}

function setvalue(record, value) {
  if (!record) throw new TypeError('record is required');
  record['value'] = normalizeField('value', value);
  return record;
}

function hasvalue(record) {
  return Boolean(record && record['value'] !== undefined && record['value'] !== null && record['value'] !== '');
}

function clearvalue(record) {
  if (record) delete record['value'];
  return record;
}

function validatevalue(value) {
  const result = validatePayload({ 'value': value }, { partial: true });
  return result.errors.filter(error => error.field === 'value');
}

function describevalue() {
  return describeParameter('value');
}

function defaultvalue() {
  return createDefaultParameters()['value'];
}

const valueParameter = Object.freeze({
  name: 'value',
  definition: PARAMETER_DEFINITIONS['value'],
  get: getvalue,
  set: setvalue,
  has: hasvalue,
  clear: clearvalue,
  validate: validatevalue,
  describe: describevalue,
  defaultValue: defaultvalue
});


function getminorder(record) {
  return record ? clone(record['minOrder']) : undefined;
}

function setminorder(record, value) {
  if (!record) throw new TypeError('record is required');
  record['minOrder'] = normalizeField('minOrder', value);
  return record;
}

function hasminorder(record) {
  return Boolean(record && record['minOrder'] !== undefined && record['minOrder'] !== null && record['minOrder'] !== '');
}

function clearminorder(record) {
  if (record) delete record['minOrder'];
  return record;
}

function validateminorder(value) {
  const result = validatePayload({ 'minOrder': value }, { partial: true });
  return result.errors.filter(error => error.field === 'minOrder');
}

function describeminorder() {
  return describeParameter('minOrder');
}

function defaultminorder() {
  return createDefaultParameters()['minOrder'];
}

const minorderParameter = Object.freeze({
  name: 'minOrder',
  definition: PARAMETER_DEFINITIONS['minOrder'],
  get: getminorder,
  set: setminorder,
  has: hasminorder,
  clear: clearminorder,
  validate: validateminorder,
  describe: describeminorder,
  defaultValue: defaultminorder
});


function getmaxdiscount(record) {
  return record ? clone(record['maxDiscount']) : undefined;
}

function setmaxdiscount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['maxDiscount'] = normalizeField('maxDiscount', value);
  return record;
}

function hasmaxdiscount(record) {
  return Boolean(record && record['maxDiscount'] !== undefined && record['maxDiscount'] !== null && record['maxDiscount'] !== '');
}

function clearmaxdiscount(record) {
  if (record) delete record['maxDiscount'];
  return record;
}

function validatemaxdiscount(value) {
  const result = validatePayload({ 'maxDiscount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'maxDiscount');
}

function describemaxdiscount() {
  return describeParameter('maxDiscount');
}

function defaultmaxdiscount() {
  return createDefaultParameters()['maxDiscount'];
}

const maxdiscountParameter = Object.freeze({
  name: 'maxDiscount',
  definition: PARAMETER_DEFINITIONS['maxDiscount'],
  get: getmaxdiscount,
  set: setmaxdiscount,
  has: hasmaxdiscount,
  clear: clearmaxdiscount,
  validate: validatemaxdiscount,
  describe: describemaxdiscount,
  defaultValue: defaultmaxdiscount
});


function getusagelimit(record) {
  return record ? clone(record['usageLimit']) : undefined;
}

function setusagelimit(record, value) {
  if (!record) throw new TypeError('record is required');
  record['usageLimit'] = normalizeField('usageLimit', value);
  return record;
}

function hasusagelimit(record) {
  return Boolean(record && record['usageLimit'] !== undefined && record['usageLimit'] !== null && record['usageLimit'] !== '');
}

function clearusagelimit(record) {
  if (record) delete record['usageLimit'];
  return record;
}

function validateusagelimit(value) {
  const result = validatePayload({ 'usageLimit': value }, { partial: true });
  return result.errors.filter(error => error.field === 'usageLimit');
}

function describeusagelimit() {
  return describeParameter('usageLimit');
}

function defaultusagelimit() {
  return createDefaultParameters()['usageLimit'];
}

const usagelimitParameter = Object.freeze({
  name: 'usageLimit',
  definition: PARAMETER_DEFINITIONS['usageLimit'],
  get: getusagelimit,
  set: setusagelimit,
  has: hasusagelimit,
  clear: clearusagelimit,
  validate: validateusagelimit,
  describe: describeusagelimit,
  defaultValue: defaultusagelimit
});


function getusagecount(record) {
  return record ? clone(record['usageCount']) : undefined;
}

function setusagecount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['usageCount'] = normalizeField('usageCount', value);
  return record;
}

function hasusagecount(record) {
  return Boolean(record && record['usageCount'] !== undefined && record['usageCount'] !== null && record['usageCount'] !== '');
}

function clearusagecount(record) {
  if (record) delete record['usageCount'];
  return record;
}

function validateusagecount(value) {
  const result = validatePayload({ 'usageCount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'usageCount');
}

function describeusagecount() {
  return describeParameter('usageCount');
}

function defaultusagecount() {
  return createDefaultParameters()['usageCount'];
}

const usagecountParameter = Object.freeze({
  name: 'usageCount',
  definition: PARAMETER_DEFINITIONS['usageCount'],
  get: getusagecount,
  set: setusagecount,
  has: hasusagecount,
  clear: clearusagecount,
  validate: validateusagecount,
  describe: describeusagecount,
  defaultValue: defaultusagecount
});


function getperuserlimit(record) {
  return record ? clone(record['perUserLimit']) : undefined;
}

function setperuserlimit(record, value) {
  if (!record) throw new TypeError('record is required');
  record['perUserLimit'] = normalizeField('perUserLimit', value);
  return record;
}

function hasperuserlimit(record) {
  return Boolean(record && record['perUserLimit'] !== undefined && record['perUserLimit'] !== null && record['perUserLimit'] !== '');
}

function clearperuserlimit(record) {
  if (record) delete record['perUserLimit'];
  return record;
}

function validateperuserlimit(value) {
  const result = validatePayload({ 'perUserLimit': value }, { partial: true });
  return result.errors.filter(error => error.field === 'perUserLimit');
}

function describeperuserlimit() {
  return describeParameter('perUserLimit');
}

function defaultperuserlimit() {
  return createDefaultParameters()['perUserLimit'];
}

const peruserlimitParameter = Object.freeze({
  name: 'perUserLimit',
  definition: PARAMETER_DEFINITIONS['perUserLimit'],
  get: getperuserlimit,
  set: setperuserlimit,
  has: hasperuserlimit,
  clear: clearperuserlimit,
  validate: validateperuserlimit,
  describe: describeperuserlimit,
  defaultValue: defaultperuserlimit
});


function getstartsat(record) {
  return record ? clone(record['startsAt']) : undefined;
}

function setstartsat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['startsAt'] = normalizeField('startsAt', value);
  return record;
}

function hasstartsat(record) {
  return Boolean(record && record['startsAt'] !== undefined && record['startsAt'] !== null && record['startsAt'] !== '');
}

function clearstartsat(record) {
  if (record) delete record['startsAt'];
  return record;
}

function validatestartsat(value) {
  const result = validatePayload({ 'startsAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'startsAt');
}

function describestartsat() {
  return describeParameter('startsAt');
}

function defaultstartsat() {
  return createDefaultParameters()['startsAt'];
}

const startsatParameter = Object.freeze({
  name: 'startsAt',
  definition: PARAMETER_DEFINITIONS['startsAt'],
  get: getstartsat,
  set: setstartsat,
  has: hasstartsat,
  clear: clearstartsat,
  validate: validatestartsat,
  describe: describestartsat,
  defaultValue: defaultstartsat
});


function getendsat(record) {
  return record ? clone(record['endsAt']) : undefined;
}

function setendsat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['endsAt'] = normalizeField('endsAt', value);
  return record;
}

function hasendsat(record) {
  return Boolean(record && record['endsAt'] !== undefined && record['endsAt'] !== null && record['endsAt'] !== '');
}

function clearendsat(record) {
  if (record) delete record['endsAt'];
  return record;
}

function validateendsat(value) {
  const result = validatePayload({ 'endsAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'endsAt');
}

function describeendsat() {
  return describeParameter('endsAt');
}

function defaultendsat() {
  return createDefaultParameters()['endsAt'];
}

const endsatParameter = Object.freeze({
  name: 'endsAt',
  definition: PARAMETER_DEFINITIONS['endsAt'],
  get: getendsat,
  set: setendsat,
  has: hasendsat,
  clear: clearendsat,
  validate: validateendsat,
  describe: describeendsat,
  defaultValue: defaultendsat
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
  code: codeParameter,
  type: typeParameter,
  value: valueParameter,
  minorder: minorderParameter,
  maxdiscount: maxdiscountParameter,
  usagelimit: usagelimitParameter,
  usagecount: usagecountParameter,
  peruserlimit: peruserlimitParameter,
  startsat: startsatParameter,
  endsat: endsatParameter,
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
  const value = normalizeField('code', input['code']);
  const definition = PARAMETER_DEFINITIONS['code'];
  return {
    field: 'code',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'code' : 'code')]: value }, { partial: true }).valid
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
  const value = normalizeField('value', input['value']);
  const definition = PARAMETER_DEFINITIONS['value'];
  return {
    field: 'value',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'value' : 'value')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('minOrder', input['minOrder']);
  const definition = PARAMETER_DEFINITIONS['minOrder'];
  return {
    field: 'minOrder',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'minOrder' : 'minOrder')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('maxDiscount', input['maxDiscount']);
  const definition = PARAMETER_DEFINITIONS['maxDiscount'];
  return {
    field: 'maxDiscount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'maxDiscount' : 'maxDiscount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('usageLimit', input['usageLimit']);
  const definition = PARAMETER_DEFINITIONS['usageLimit'];
  return {
    field: 'usageLimit',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'usageLimit' : 'usageLimit')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('usageCount', input['usageCount']);
  const definition = PARAMETER_DEFINITIONS['usageCount'];
  return {
    field: 'usageCount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'usageCount' : 'usageCount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('perUserLimit', input['perUserLimit']);
  const definition = PARAMETER_DEFINITIONS['perUserLimit'];
  return {
    field: 'perUserLimit',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'perUserLimit' : 'perUserLimit')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('startsAt', input['startsAt']);
  const definition = PARAMETER_DEFINITIONS['startsAt'];
  return {
    field: 'startsAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'startsAt' : 'startsAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('endsAt', input['endsAt']);
  const definition = PARAMETER_DEFINITIONS['endsAt'];
  return {
    field: 'endsAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'endsAt' : 'endsAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
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

function parameterPolicy_13(input = {}) {
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
