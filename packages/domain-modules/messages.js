
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'messages';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'senderId', 'receiverId', 'orderId', 'subject', 'body', 'attachments', 'readAt', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'senderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'receiverId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'subject': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'body': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'attachments': Object.freeze({'type': 'array', 'required': false, 'nullable': true}),
  'readAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getsenderid(record) {
  return record ? clone(record['senderId']) : undefined;
}

function setsenderid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['senderId'] = normalizeField('senderId', value);
  return record;
}

function hassenderid(record) {
  return Boolean(record && record['senderId'] !== undefined && record['senderId'] !== null && record['senderId'] !== '');
}

function clearsenderid(record) {
  if (record) delete record['senderId'];
  return record;
}

function validatesenderid(value) {
  const result = validatePayload({ 'senderId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'senderId');
}

function describesenderid() {
  return describeParameter('senderId');
}

function defaultsenderid() {
  return createDefaultParameters()['senderId'];
}

const senderidParameter = Object.freeze({
  name: 'senderId',
  definition: PARAMETER_DEFINITIONS['senderId'],
  get: getsenderid,
  set: setsenderid,
  has: hassenderid,
  clear: clearsenderid,
  validate: validatesenderid,
  describe: describesenderid,
  defaultValue: defaultsenderid
});


function getreceiverid(record) {
  return record ? clone(record['receiverId']) : undefined;
}

function setreceiverid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['receiverId'] = normalizeField('receiverId', value);
  return record;
}

function hasreceiverid(record) {
  return Boolean(record && record['receiverId'] !== undefined && record['receiverId'] !== null && record['receiverId'] !== '');
}

function clearreceiverid(record) {
  if (record) delete record['receiverId'];
  return record;
}

function validatereceiverid(value) {
  const result = validatePayload({ 'receiverId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'receiverId');
}

function describereceiverid() {
  return describeParameter('receiverId');
}

function defaultreceiverid() {
  return createDefaultParameters()['receiverId'];
}

const receiveridParameter = Object.freeze({
  name: 'receiverId',
  definition: PARAMETER_DEFINITIONS['receiverId'],
  get: getreceiverid,
  set: setreceiverid,
  has: hasreceiverid,
  clear: clearreceiverid,
  validate: validatereceiverid,
  describe: describereceiverid,
  defaultValue: defaultreceiverid
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


function getbody(record) {
  return record ? clone(record['body']) : undefined;
}

function setbody(record, value) {
  if (!record) throw new TypeError('record is required');
  record['body'] = normalizeField('body', value);
  return record;
}

function hasbody(record) {
  return Boolean(record && record['body'] !== undefined && record['body'] !== null && record['body'] !== '');
}

function clearbody(record) {
  if (record) delete record['body'];
  return record;
}

function validatebody(value) {
  const result = validatePayload({ 'body': value }, { partial: true });
  return result.errors.filter(error => error.field === 'body');
}

function describebody() {
  return describeParameter('body');
}

function defaultbody() {
  return createDefaultParameters()['body'];
}

const bodyParameter = Object.freeze({
  name: 'body',
  definition: PARAMETER_DEFINITIONS['body'],
  get: getbody,
  set: setbody,
  has: hasbody,
  clear: clearbody,
  validate: validatebody,
  describe: describebody,
  defaultValue: defaultbody
});


function getattachments(record) {
  return record ? clone(record['attachments']) : undefined;
}

function setattachments(record, value) {
  if (!record) throw new TypeError('record is required');
  record['attachments'] = normalizeField('attachments', value);
  return record;
}

function hasattachments(record) {
  return Boolean(record && record['attachments'] !== undefined && record['attachments'] !== null && record['attachments'] !== '');
}

function clearattachments(record) {
  if (record) delete record['attachments'];
  return record;
}

function validateattachments(value) {
  const result = validatePayload({ 'attachments': value }, { partial: true });
  return result.errors.filter(error => error.field === 'attachments');
}

function describeattachments() {
  return describeParameter('attachments');
}

function defaultattachments() {
  return createDefaultParameters()['attachments'];
}

const attachmentsParameter = Object.freeze({
  name: 'attachments',
  definition: PARAMETER_DEFINITIONS['attachments'],
  get: getattachments,
  set: setattachments,
  has: hasattachments,
  clear: clearattachments,
  validate: validateattachments,
  describe: describeattachments,
  defaultValue: defaultattachments
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
  senderid: senderidParameter,
  receiverid: receiveridParameter,
  orderid: orderidParameter,
  subject: subjectParameter,
  body: bodyParameter,
  attachments: attachmentsParameter,
  readat: readatParameter,
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
  const value = normalizeField('senderId', input['senderId']);
  const definition = PARAMETER_DEFINITIONS['senderId'];
  return {
    field: 'senderId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'senderId' : 'senderId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
  const value = normalizeField('receiverId', input['receiverId']);
  const definition = PARAMETER_DEFINITIONS['receiverId'];
  return {
    field: 'receiverId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'receiverId' : 'receiverId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
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

function parameterPolicy_4(input = {}) {
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

function parameterPolicy_5(input = {}) {
  const value = normalizeField('body', input['body']);
  const definition = PARAMETER_DEFINITIONS['body'];
  return {
    field: 'body',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'body' : 'body')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('attachments', input['attachments']);
  const definition = PARAMETER_DEFINITIONS['attachments'];
  return {
    field: 'attachments',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'attachments' : 'attachments')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
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
