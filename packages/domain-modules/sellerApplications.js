
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'sellerApplications';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'shopName', 'legalName', 'taxId', 'documents', 'status', 'reviewerId', 'reviewNotes', 'submittedAt', 'reviewedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'shopName': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'legalName': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'taxId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'documents': Object.freeze({'type': 'array', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'reviewerId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'reviewNotes': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'submittedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'reviewedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getshopname(record) {
  return record ? clone(record['shopName']) : undefined;
}

function setshopname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shopName'] = normalizeField('shopName', value);
  return record;
}

function hasshopname(record) {
  return Boolean(record && record['shopName'] !== undefined && record['shopName'] !== null && record['shopName'] !== '');
}

function clearshopname(record) {
  if (record) delete record['shopName'];
  return record;
}

function validateshopname(value) {
  const result = validatePayload({ 'shopName': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shopName');
}

function describeshopname() {
  return describeParameter('shopName');
}

function defaultshopname() {
  return createDefaultParameters()['shopName'];
}

const shopnameParameter = Object.freeze({
  name: 'shopName',
  definition: PARAMETER_DEFINITIONS['shopName'],
  get: getshopname,
  set: setshopname,
  has: hasshopname,
  clear: clearshopname,
  validate: validateshopname,
  describe: describeshopname,
  defaultValue: defaultshopname
});


function getlegalname(record) {
  return record ? clone(record['legalName']) : undefined;
}

function setlegalname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['legalName'] = normalizeField('legalName', value);
  return record;
}

function haslegalname(record) {
  return Boolean(record && record['legalName'] !== undefined && record['legalName'] !== null && record['legalName'] !== '');
}

function clearlegalname(record) {
  if (record) delete record['legalName'];
  return record;
}

function validatelegalname(value) {
  const result = validatePayload({ 'legalName': value }, { partial: true });
  return result.errors.filter(error => error.field === 'legalName');
}

function describelegalname() {
  return describeParameter('legalName');
}

function defaultlegalname() {
  return createDefaultParameters()['legalName'];
}

const legalnameParameter = Object.freeze({
  name: 'legalName',
  definition: PARAMETER_DEFINITIONS['legalName'],
  get: getlegalname,
  set: setlegalname,
  has: haslegalname,
  clear: clearlegalname,
  validate: validatelegalname,
  describe: describelegalname,
  defaultValue: defaultlegalname
});


function gettaxid(record) {
  return record ? clone(record['taxId']) : undefined;
}

function settaxid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['taxId'] = normalizeField('taxId', value);
  return record;
}

function hastaxid(record) {
  return Boolean(record && record['taxId'] !== undefined && record['taxId'] !== null && record['taxId'] !== '');
}

function cleartaxid(record) {
  if (record) delete record['taxId'];
  return record;
}

function validatetaxid(value) {
  const result = validatePayload({ 'taxId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'taxId');
}

function describetaxid() {
  return describeParameter('taxId');
}

function defaulttaxid() {
  return createDefaultParameters()['taxId'];
}

const taxidParameter = Object.freeze({
  name: 'taxId',
  definition: PARAMETER_DEFINITIONS['taxId'],
  get: gettaxid,
  set: settaxid,
  has: hastaxid,
  clear: cleartaxid,
  validate: validatetaxid,
  describe: describetaxid,
  defaultValue: defaulttaxid
});


function getdocuments(record) {
  return record ? clone(record['documents']) : undefined;
}

function setdocuments(record, value) {
  if (!record) throw new TypeError('record is required');
  record['documents'] = normalizeField('documents', value);
  return record;
}

function hasdocuments(record) {
  return Boolean(record && record['documents'] !== undefined && record['documents'] !== null && record['documents'] !== '');
}

function cleardocuments(record) {
  if (record) delete record['documents'];
  return record;
}

function validatedocuments(value) {
  const result = validatePayload({ 'documents': value }, { partial: true });
  return result.errors.filter(error => error.field === 'documents');
}

function describedocuments() {
  return describeParameter('documents');
}

function defaultdocuments() {
  return createDefaultParameters()['documents'];
}

const documentsParameter = Object.freeze({
  name: 'documents',
  definition: PARAMETER_DEFINITIONS['documents'],
  get: getdocuments,
  set: setdocuments,
  has: hasdocuments,
  clear: cleardocuments,
  validate: validatedocuments,
  describe: describedocuments,
  defaultValue: defaultdocuments
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


function getreviewerid(record) {
  return record ? clone(record['reviewerId']) : undefined;
}

function setreviewerid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reviewerId'] = normalizeField('reviewerId', value);
  return record;
}

function hasreviewerid(record) {
  return Boolean(record && record['reviewerId'] !== undefined && record['reviewerId'] !== null && record['reviewerId'] !== '');
}

function clearreviewerid(record) {
  if (record) delete record['reviewerId'];
  return record;
}

function validatereviewerid(value) {
  const result = validatePayload({ 'reviewerId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reviewerId');
}

function describereviewerid() {
  return describeParameter('reviewerId');
}

function defaultreviewerid() {
  return createDefaultParameters()['reviewerId'];
}

const revieweridParameter = Object.freeze({
  name: 'reviewerId',
  definition: PARAMETER_DEFINITIONS['reviewerId'],
  get: getreviewerid,
  set: setreviewerid,
  has: hasreviewerid,
  clear: clearreviewerid,
  validate: validatereviewerid,
  describe: describereviewerid,
  defaultValue: defaultreviewerid
});


function getreviewnotes(record) {
  return record ? clone(record['reviewNotes']) : undefined;
}

function setreviewnotes(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reviewNotes'] = normalizeField('reviewNotes', value);
  return record;
}

function hasreviewnotes(record) {
  return Boolean(record && record['reviewNotes'] !== undefined && record['reviewNotes'] !== null && record['reviewNotes'] !== '');
}

function clearreviewnotes(record) {
  if (record) delete record['reviewNotes'];
  return record;
}

function validatereviewnotes(value) {
  const result = validatePayload({ 'reviewNotes': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reviewNotes');
}

function describereviewnotes() {
  return describeParameter('reviewNotes');
}

function defaultreviewnotes() {
  return createDefaultParameters()['reviewNotes'];
}

const reviewnotesParameter = Object.freeze({
  name: 'reviewNotes',
  definition: PARAMETER_DEFINITIONS['reviewNotes'],
  get: getreviewnotes,
  set: setreviewnotes,
  has: hasreviewnotes,
  clear: clearreviewnotes,
  validate: validatereviewnotes,
  describe: describereviewnotes,
  defaultValue: defaultreviewnotes
});


function getsubmittedat(record) {
  return record ? clone(record['submittedAt']) : undefined;
}

function setsubmittedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['submittedAt'] = normalizeField('submittedAt', value);
  return record;
}

function hassubmittedat(record) {
  return Boolean(record && record['submittedAt'] !== undefined && record['submittedAt'] !== null && record['submittedAt'] !== '');
}

function clearsubmittedat(record) {
  if (record) delete record['submittedAt'];
  return record;
}

function validatesubmittedat(value) {
  const result = validatePayload({ 'submittedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'submittedAt');
}

function describesubmittedat() {
  return describeParameter('submittedAt');
}

function defaultsubmittedat() {
  return createDefaultParameters()['submittedAt'];
}

const submittedatParameter = Object.freeze({
  name: 'submittedAt',
  definition: PARAMETER_DEFINITIONS['submittedAt'],
  get: getsubmittedat,
  set: setsubmittedat,
  has: hassubmittedat,
  clear: clearsubmittedat,
  validate: validatesubmittedat,
  describe: describesubmittedat,
  defaultValue: defaultsubmittedat
});


function getreviewedat(record) {
  return record ? clone(record['reviewedAt']) : undefined;
}

function setreviewedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reviewedAt'] = normalizeField('reviewedAt', value);
  return record;
}

function hasreviewedat(record) {
  return Boolean(record && record['reviewedAt'] !== undefined && record['reviewedAt'] !== null && record['reviewedAt'] !== '');
}

function clearreviewedat(record) {
  if (record) delete record['reviewedAt'];
  return record;
}

function validatereviewedat(value) {
  const result = validatePayload({ 'reviewedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reviewedAt');
}

function describereviewedat() {
  return describeParameter('reviewedAt');
}

function defaultreviewedat() {
  return createDefaultParameters()['reviewedAt'];
}

const reviewedatParameter = Object.freeze({
  name: 'reviewedAt',
  definition: PARAMETER_DEFINITIONS['reviewedAt'],
  get: getreviewedat,
  set: setreviewedat,
  has: hasreviewedat,
  clear: clearreviewedat,
  validate: validatereviewedat,
  describe: describereviewedat,
  defaultValue: defaultreviewedat
});


const PARAMETERS = Object.freeze({
  id: idParameter,
  userid: useridParameter,
  shopname: shopnameParameter,
  legalname: legalnameParameter,
  taxid: taxidParameter,
  documents: documentsParameter,
  status: statusParameter,
  reviewerid: revieweridParameter,
  reviewnotes: reviewnotesParameter,
  submittedat: submittedatParameter,
  reviewedat: reviewedatParameter,
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
  const value = normalizeField('shopName', input['shopName']);
  const definition = PARAMETER_DEFINITIONS['shopName'];
  return {
    field: 'shopName',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shopName' : 'shopName')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('legalName', input['legalName']);
  const definition = PARAMETER_DEFINITIONS['legalName'];
  return {
    field: 'legalName',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'legalName' : 'legalName')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('taxId', input['taxId']);
  const definition = PARAMETER_DEFINITIONS['taxId'];
  return {
    field: 'taxId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'taxId' : 'taxId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('documents', input['documents']);
  const definition = PARAMETER_DEFINITIONS['documents'];
  return {
    field: 'documents',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'documents' : 'documents')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
  const value = normalizeField('reviewerId', input['reviewerId']);
  const definition = PARAMETER_DEFINITIONS['reviewerId'];
  return {
    field: 'reviewerId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reviewerId' : 'reviewerId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('reviewNotes', input['reviewNotes']);
  const definition = PARAMETER_DEFINITIONS['reviewNotes'];
  return {
    field: 'reviewNotes',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reviewNotes' : 'reviewNotes')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('submittedAt', input['submittedAt']);
  const definition = PARAMETER_DEFINITIONS['submittedAt'];
  return {
    field: 'submittedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'submittedAt' : 'submittedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('reviewedAt', input['reviewedAt']);
  const definition = PARAMETER_DEFINITIONS['reviewedAt'];
  return {
    field: 'reviewedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reviewedAt' : 'reviewedAt')]: value }, { partial: true }).valid
  };
}

for (const [index, field] of FIELD_NAMES.entries()) {
  module.exports[`parameterPolicy_${index}`] = input => {
    const definition = PARAMETER_DEFINITIONS[field];
    const value = normalizeField(field, input ? input[field] : undefined);
    return { field, value, type: definition.type, required: definition.required, nullable: definition.nullable };
  };
}
