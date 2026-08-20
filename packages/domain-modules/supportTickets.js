
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'supportTickets';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'orderId', 'category', 'priority', 'subject', 'description', 'status', 'assignedTo', 'resolution', 'closedAt', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'category': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'priority': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'subject': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'description': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'assignedTo': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'resolution': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'closedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getorderid(record) {
  return record ? clone(record['orderId']) : undefined;
}

function setorderid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['orderId'] = normalizeField('orderId', value);
  return record;
}

function hasorderid(record) {
  return Boolean(record && record['orderId'] !== undefined && record['orderId'] !== null && record['orderId'] !== '');
}

function clearorderid(record) {
  if (record) delete record['orderId'];
  return record;
}

function validateorderid(value) {
  const result = validatePayload({ 'orderId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'orderId');
}

function describeorderid() {
  return describeParameter('orderId');
}

function defaultorderid() {
  return createDefaultParameters()['orderId'];
}

const orderidParameter = Object.freeze({
  name: 'orderId',
  definition: PARAMETER_DEFINITIONS['orderId'],
  get: getorderid,
  set: setorderid,
  has: hasorderid,
  clear: clearorderid,
  validate: validateorderid,
  describe: describeorderid,
  defaultValue: defaultorderid
});


function getcategory(record) {
  return record ? clone(record['category']) : undefined;
}

function setcategory(record, value) {
  if (!record) throw new TypeError('record is required');
  record['category'] = normalizeField('category', value);
  return record;
}

function hascategory(record) {
  return Boolean(record && record['category'] !== undefined && record['category'] !== null && record['category'] !== '');
}

function clearcategory(record) {
  if (record) delete record['category'];
  return record;
}

function validatecategory(value) {
  const result = validatePayload({ 'category': value }, { partial: true });
  return result.errors.filter(error => error.field === 'category');
}

function describecategory() {
  return describeParameter('category');
}

function defaultcategory() {
  return createDefaultParameters()['category'];
}

const categoryParameter = Object.freeze({
  name: 'category',
  definition: PARAMETER_DEFINITIONS['category'],
  get: getcategory,
  set: setcategory,
  has: hascategory,
  clear: clearcategory,
  validate: validatecategory,
  describe: describecategory,
  defaultValue: defaultcategory
});


function getpriority(record) {
  return record ? clone(record['priority']) : undefined;
}

function setpriority(record, value) {
  if (!record) throw new TypeError('record is required');
  record['priority'] = normalizeField('priority', value);
  return record;
}

function haspriority(record) {
  return Boolean(record && record['priority'] !== undefined && record['priority'] !== null && record['priority'] !== '');
}

function clearpriority(record) {
  if (record) delete record['priority'];
  return record;
}

function validatepriority(value) {
  const result = validatePayload({ 'priority': value }, { partial: true });
  return result.errors.filter(error => error.field === 'priority');
}

function describepriority() {
  return describeParameter('priority');
}

function defaultpriority() {
  return createDefaultParameters()['priority'];
}

const priorityParameter = Object.freeze({
  name: 'priority',
  definition: PARAMETER_DEFINITIONS['priority'],
  get: getpriority,
  set: setpriority,
  has: haspriority,
  clear: clearpriority,
  validate: validatepriority,
  describe: describepriority,
  defaultValue: defaultpriority
});


function getsubject(record) {
  return record ? clone(record['subject']) : undefined;
}

function setsubject(record, value) {
  if (!record) throw new TypeError('record is required');
  record['subject'] = normalizeField('subject', value);
  return record;
}

function hassubject(record) {
  return Boolean(record && record['subject'] !== undefined && record['subject'] !== null && record['subject'] !== '');
}

function clearsubject(record) {
  if (record) delete record['subject'];
  return record;
}

function validatesubject(value) {
  const result = validatePayload({ 'subject': value }, { partial: true });
  return result.errors.filter(error => error.field === 'subject');
}

function describesubject() {
  return describeParameter('subject');
}

function defaultsubject() {
  return createDefaultParameters()['subject'];
}

const subjectParameter = Object.freeze({
  name: 'subject',
  definition: PARAMETER_DEFINITIONS['subject'],
  get: getsubject,
  set: setsubject,
  has: hassubject,
  clear: clearsubject,
  validate: validatesubject,
  describe: describesubject,
  defaultValue: defaultsubject
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


function getassignedto(record) {
  return record ? clone(record['assignedTo']) : undefined;
}

function setassignedto(record, value) {
  if (!record) throw new TypeError('record is required');
  record['assignedTo'] = normalizeField('assignedTo', value);
  return record;
}

function hasassignedto(record) {
  return Boolean(record && record['assignedTo'] !== undefined && record['assignedTo'] !== null && record['assignedTo'] !== '');
}

function clearassignedto(record) {
  if (record) delete record['assignedTo'];
  return record;
}

function validateassignedto(value) {
  const result = validatePayload({ 'assignedTo': value }, { partial: true });
  return result.errors.filter(error => error.field === 'assignedTo');
}

function describeassignedto() {
  return describeParameter('assignedTo');
}

function defaultassignedto() {
  return createDefaultParameters()['assignedTo'];
}

const assignedtoParameter = Object.freeze({
  name: 'assignedTo',
  definition: PARAMETER_DEFINITIONS['assignedTo'],
  get: getassignedto,
  set: setassignedto,
  has: hasassignedto,
  clear: clearassignedto,
  validate: validateassignedto,
  describe: describeassignedto,
  defaultValue: defaultassignedto
});


function getresolution(record) {
  return record ? clone(record['resolution']) : undefined;
}

function setresolution(record, value) {
  if (!record) throw new TypeError('record is required');
  record['resolution'] = normalizeField('resolution', value);
  return record;
}

function hasresolution(record) {
  return Boolean(record && record['resolution'] !== undefined && record['resolution'] !== null && record['resolution'] !== '');
}

function clearresolution(record) {
  if (record) delete record['resolution'];
  return record;
}

function validateresolution(value) {
  const result = validatePayload({ 'resolution': value }, { partial: true });
  return result.errors.filter(error => error.field === 'resolution');
}

function describeresolution() {
  return describeParameter('resolution');
}

function defaultresolution() {
  return createDefaultParameters()['resolution'];
}

const resolutionParameter = Object.freeze({
  name: 'resolution',
  definition: PARAMETER_DEFINITIONS['resolution'],
  get: getresolution,
  set: setresolution,
  has: hasresolution,
  clear: clearresolution,
  validate: validateresolution,
  describe: describeresolution,
  defaultValue: defaultresolution
});


function getclosedat(record) {
  return record ? clone(record['closedAt']) : undefined;
}

function setclosedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['closedAt'] = normalizeField('closedAt', value);
  return record;
}

function hasclosedat(record) {
  return Boolean(record && record['closedAt'] !== undefined && record['closedAt'] !== null && record['closedAt'] !== '');
}

function clearclosedat(record) {
  if (record) delete record['closedAt'];
  return record;
}

function validateclosedat(value) {
  const result = validatePayload({ 'closedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'closedAt');
}

function describeclosedat() {
  return describeParameter('closedAt');
}

function defaultclosedat() {
  return createDefaultParameters()['closedAt'];
}

const closedatParameter = Object.freeze({
  name: 'closedAt',
  definition: PARAMETER_DEFINITIONS['closedAt'],
  get: getclosedat,
  set: setclosedat,
  has: hasclosedat,
  clear: clearclosedat,
  validate: validateclosedat,
  describe: describeclosedat,
  defaultValue: defaultclosedat
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
  orderid: orderidParameter,
  category: categoryParameter,
  priority: priorityParameter,
  subject: subjectParameter,
  description: descriptionParameter,
  status: statusParameter,
  assignedto: assignedtoParameter,
  resolution: resolutionParameter,
  closedat: closedatParameter,
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
  const value = normalizeField('orderId', input['orderId']);
  const definition = PARAMETER_DEFINITIONS['orderId'];
  return {
    field: 'orderId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'orderId' : 'orderId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('category', input['category']);
  const definition = PARAMETER_DEFINITIONS['category'];
  return {
    field: 'category',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'category' : 'category')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('priority', input['priority']);
  const definition = PARAMETER_DEFINITIONS['priority'];
  return {
    field: 'priority',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'priority' : 'priority')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('subject', input['subject']);
  const definition = PARAMETER_DEFINITIONS['subject'];
  return {
    field: 'subject',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'subject' : 'subject')]: value }, { partial: true }).valid
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

function parameterPolicy_8(input = {}) {
  const value = normalizeField('assignedTo', input['assignedTo']);
  const definition = PARAMETER_DEFINITIONS['assignedTo'];
  return {
    field: 'assignedTo',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'assignedTo' : 'assignedTo')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('resolution', input['resolution']);
  const definition = PARAMETER_DEFINITIONS['resolution'];
  return {
    field: 'resolution',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'resolution' : 'resolution')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('closedAt', input['closedAt']);
  const definition = PARAMETER_DEFINITIONS['closedAt'];
  return {
    field: 'closedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'closedAt' : 'closedAt')]: value }, { partial: true }).valid
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
