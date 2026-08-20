
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'shippingRates';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'zoneId', 'carrier', 'service', 'minWeight', 'maxWeight', 'minOrder', 'maxOrder', 'rate', 'freeThreshold', 'active', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'zoneId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'carrier': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'service': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'minWeight': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'maxWeight': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'minOrder': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'maxOrder': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'rate': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'freeThreshold': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
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


function getzoneid(record) {
  return record ? clone(record['zoneId']) : undefined;
}

function setzoneid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['zoneId'] = normalizeField('zoneId', value);
  return record;
}

function haszoneid(record) {
  return Boolean(record && record['zoneId'] !== undefined && record['zoneId'] !== null && record['zoneId'] !== '');
}

function clearzoneid(record) {
  if (record) delete record['zoneId'];
  return record;
}

function validatezoneid(value) {
  const result = validatePayload({ 'zoneId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'zoneId');
}

function describezoneid() {
  return describeParameter('zoneId');
}

function defaultzoneid() {
  return createDefaultParameters()['zoneId'];
}

const zoneidParameter = Object.freeze({
  name: 'zoneId',
  definition: PARAMETER_DEFINITIONS['zoneId'],
  get: getzoneid,
  set: setzoneid,
  has: haszoneid,
  clear: clearzoneid,
  validate: validatezoneid,
  describe: describezoneid,
  defaultValue: defaultzoneid
});


function getcarrier(record) {
  return record ? clone(record['carrier']) : undefined;
}

function setcarrier(record, value) {
  if (!record) throw new TypeError('record is required');
  record['carrier'] = normalizeField('carrier', value);
  return record;
}

function hascarrier(record) {
  return Boolean(record && record['carrier'] !== undefined && record['carrier'] !== null && record['carrier'] !== '');
}

function clearcarrier(record) {
  if (record) delete record['carrier'];
  return record;
}

function validatecarrier(value) {
  const result = validatePayload({ 'carrier': value }, { partial: true });
  return result.errors.filter(error => error.field === 'carrier');
}

function describecarrier() {
  return describeParameter('carrier');
}

function defaultcarrier() {
  return createDefaultParameters()['carrier'];
}

const carrierParameter = Object.freeze({
  name: 'carrier',
  definition: PARAMETER_DEFINITIONS['carrier'],
  get: getcarrier,
  set: setcarrier,
  has: hascarrier,
  clear: clearcarrier,
  validate: validatecarrier,
  describe: describecarrier,
  defaultValue: defaultcarrier
});


function getservice(record) {
  return record ? clone(record['service']) : undefined;
}

function setservice(record, value) {
  if (!record) throw new TypeError('record is required');
  record['service'] = normalizeField('service', value);
  return record;
}

function hasservice(record) {
  return Boolean(record && record['service'] !== undefined && record['service'] !== null && record['service'] !== '');
}

function clearservice(record) {
  if (record) delete record['service'];
  return record;
}

function validateservice(value) {
  const result = validatePayload({ 'service': value }, { partial: true });
  return result.errors.filter(error => error.field === 'service');
}

function describeservice() {
  return describeParameter('service');
}

function defaultservice() {
  return createDefaultParameters()['service'];
}

const serviceParameter = Object.freeze({
  name: 'service',
  definition: PARAMETER_DEFINITIONS['service'],
  get: getservice,
  set: setservice,
  has: hasservice,
  clear: clearservice,
  validate: validateservice,
  describe: describeservice,
  defaultValue: defaultservice
});


function getminweight(record) {
  return record ? clone(record['minWeight']) : undefined;
}

function setminweight(record, value) {
  if (!record) throw new TypeError('record is required');
  record['minWeight'] = normalizeField('minWeight', value);
  return record;
}

function hasminweight(record) {
  return Boolean(record && record['minWeight'] !== undefined && record['minWeight'] !== null && record['minWeight'] !== '');
}

function clearminweight(record) {
  if (record) delete record['minWeight'];
  return record;
}

function validateminweight(value) {
  const result = validatePayload({ 'minWeight': value }, { partial: true });
  return result.errors.filter(error => error.field === 'minWeight');
}

function describeminweight() {
  return describeParameter('minWeight');
}

function defaultminweight() {
  return createDefaultParameters()['minWeight'];
}

const minweightParameter = Object.freeze({
  name: 'minWeight',
  definition: PARAMETER_DEFINITIONS['minWeight'],
  get: getminweight,
  set: setminweight,
  has: hasminweight,
  clear: clearminweight,
  validate: validateminweight,
  describe: describeminweight,
  defaultValue: defaultminweight
});


function getmaxweight(record) {
  return record ? clone(record['maxWeight']) : undefined;
}

function setmaxweight(record, value) {
  if (!record) throw new TypeError('record is required');
  record['maxWeight'] = normalizeField('maxWeight', value);
  return record;
}

function hasmaxweight(record) {
  return Boolean(record && record['maxWeight'] !== undefined && record['maxWeight'] !== null && record['maxWeight'] !== '');
}

function clearmaxweight(record) {
  if (record) delete record['maxWeight'];
  return record;
}

function validatemaxweight(value) {
  const result = validatePayload({ 'maxWeight': value }, { partial: true });
  return result.errors.filter(error => error.field === 'maxWeight');
}

function describemaxweight() {
  return describeParameter('maxWeight');
}

function defaultmaxweight() {
  return createDefaultParameters()['maxWeight'];
}

const maxweightParameter = Object.freeze({
  name: 'maxWeight',
  definition: PARAMETER_DEFINITIONS['maxWeight'],
  get: getmaxweight,
  set: setmaxweight,
  has: hasmaxweight,
  clear: clearmaxweight,
  validate: validatemaxweight,
  describe: describemaxweight,
  defaultValue: defaultmaxweight
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


function getmaxorder(record) {
  return record ? clone(record['maxOrder']) : undefined;
}

function setmaxorder(record, value) {
  if (!record) throw new TypeError('record is required');
  record['maxOrder'] = normalizeField('maxOrder', value);
  return record;
}

function hasmaxorder(record) {
  return Boolean(record && record['maxOrder'] !== undefined && record['maxOrder'] !== null && record['maxOrder'] !== '');
}

function clearmaxorder(record) {
  if (record) delete record['maxOrder'];
  return record;
}

function validatemaxorder(value) {
  const result = validatePayload({ 'maxOrder': value }, { partial: true });
  return result.errors.filter(error => error.field === 'maxOrder');
}

function describemaxorder() {
  return describeParameter('maxOrder');
}

function defaultmaxorder() {
  return createDefaultParameters()['maxOrder'];
}

const maxorderParameter = Object.freeze({
  name: 'maxOrder',
  definition: PARAMETER_DEFINITIONS['maxOrder'],
  get: getmaxorder,
  set: setmaxorder,
  has: hasmaxorder,
  clear: clearmaxorder,
  validate: validatemaxorder,
  describe: describemaxorder,
  defaultValue: defaultmaxorder
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


function getfreethreshold(record) {
  return record ? clone(record['freeThreshold']) : undefined;
}

function setfreethreshold(record, value) {
  if (!record) throw new TypeError('record is required');
  record['freeThreshold'] = normalizeField('freeThreshold', value);
  return record;
}

function hasfreethreshold(record) {
  return Boolean(record && record['freeThreshold'] !== undefined && record['freeThreshold'] !== null && record['freeThreshold'] !== '');
}

function clearfreethreshold(record) {
  if (record) delete record['freeThreshold'];
  return record;
}

function validatefreethreshold(value) {
  const result = validatePayload({ 'freeThreshold': value }, { partial: true });
  return result.errors.filter(error => error.field === 'freeThreshold');
}

function describefreethreshold() {
  return describeParameter('freeThreshold');
}

function defaultfreethreshold() {
  return createDefaultParameters()['freeThreshold'];
}

const freethresholdParameter = Object.freeze({
  name: 'freeThreshold',
  definition: PARAMETER_DEFINITIONS['freeThreshold'],
  get: getfreethreshold,
  set: setfreethreshold,
  has: hasfreethreshold,
  clear: clearfreethreshold,
  validate: validatefreethreshold,
  describe: describefreethreshold,
  defaultValue: defaultfreethreshold
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
  zoneid: zoneidParameter,
  carrier: carrierParameter,
  service: serviceParameter,
  minweight: minweightParameter,
  maxweight: maxweightParameter,
  minorder: minorderParameter,
  maxorder: maxorderParameter,
  rate: rateParameter,
  freethreshold: freethresholdParameter,
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
  const value = normalizeField('zoneId', input['zoneId']);
  const definition = PARAMETER_DEFINITIONS['zoneId'];
  return {
    field: 'zoneId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'zoneId' : 'zoneId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
  const value = normalizeField('carrier', input['carrier']);
  const definition = PARAMETER_DEFINITIONS['carrier'];
  return {
    field: 'carrier',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'carrier' : 'carrier')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('service', input['service']);
  const definition = PARAMETER_DEFINITIONS['service'];
  return {
    field: 'service',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'service' : 'service')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('minWeight', input['minWeight']);
  const definition = PARAMETER_DEFINITIONS['minWeight'];
  return {
    field: 'minWeight',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'minWeight' : 'minWeight')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('maxWeight', input['maxWeight']);
  const definition = PARAMETER_DEFINITIONS['maxWeight'];
  return {
    field: 'maxWeight',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'maxWeight' : 'maxWeight')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
  const value = normalizeField('maxOrder', input['maxOrder']);
  const definition = PARAMETER_DEFINITIONS['maxOrder'];
  return {
    field: 'maxOrder',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'maxOrder' : 'maxOrder')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
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

function parameterPolicy_9(input = {}) {
  const value = normalizeField('freeThreshold', input['freeThreshold']);
  const definition = PARAMETER_DEFINITIONS['freeThreshold'];
  return {
    field: 'freeThreshold',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'freeThreshold' : 'freeThreshold')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
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

function parameterPolicy_11(input = {}) {
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

function parameterPolicy_12(input = {}) {
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
