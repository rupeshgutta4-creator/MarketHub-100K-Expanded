
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'sellers';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'userId', 'shopName', 'legalName', 'taxId', 'email', 'phone', 'status', 'rating', 'commissionRate', 'bankAccount', 'payoutSchedule', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'userId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'shopName': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'legalName': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'taxId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'email': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'phone': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'rating': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'commissionRate': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'bankAccount': Object.freeze({'type': 'object', 'required': false, 'nullable': true}),
  'payoutSchedule': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getemail(record) {
  return record ? clone(record['email']) : undefined;
}

function setemail(record, value) {
  if (!record) throw new TypeError('record is required');
  record['email'] = normalizeField('email', value);
  return record;
}

function hasemail(record) {
  return Boolean(record && record['email'] !== undefined && record['email'] !== null && record['email'] !== '');
}

function clearemail(record) {
  if (record) delete record['email'];
  return record;
}

function validateemail(value) {
  const result = validatePayload({ 'email': value }, { partial: true });
  return result.errors.filter(error => error.field === 'email');
}

function describeemail() {
  return describeParameter('email');
}

function defaultemail() {
  return createDefaultParameters()['email'];
}

const emailParameter = Object.freeze({
  name: 'email',
  definition: PARAMETER_DEFINITIONS['email'],
  get: getemail,
  set: setemail,
  has: hasemail,
  clear: clearemail,
  validate: validateemail,
  describe: describeemail,
  defaultValue: defaultemail
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


function getrating(record) {
  return record ? clone(record['rating']) : undefined;
}

function setrating(record, value) {
  if (!record) throw new TypeError('record is required');
  record['rating'] = normalizeField('rating', value);
  return record;
}

function hasrating(record) {
  return Boolean(record && record['rating'] !== undefined && record['rating'] !== null && record['rating'] !== '');
}

function clearrating(record) {
  if (record) delete record['rating'];
  return record;
}

function validaterating(value) {
  const result = validatePayload({ 'rating': value }, { partial: true });
  return result.errors.filter(error => error.field === 'rating');
}

function describerating() {
  return describeParameter('rating');
}

function defaultrating() {
  return createDefaultParameters()['rating'];
}

const ratingParameter = Object.freeze({
  name: 'rating',
  definition: PARAMETER_DEFINITIONS['rating'],
  get: getrating,
  set: setrating,
  has: hasrating,
  clear: clearrating,
  validate: validaterating,
  describe: describerating,
  defaultValue: defaultrating
});


function getcommissionrate(record) {
  return record ? clone(record['commissionRate']) : undefined;
}

function setcommissionrate(record, value) {
  if (!record) throw new TypeError('record is required');
  record['commissionRate'] = normalizeField('commissionRate', value);
  return record;
}

function hascommissionrate(record) {
  return Boolean(record && record['commissionRate'] !== undefined && record['commissionRate'] !== null && record['commissionRate'] !== '');
}

function clearcommissionrate(record) {
  if (record) delete record['commissionRate'];
  return record;
}

function validatecommissionrate(value) {
  const result = validatePayload({ 'commissionRate': value }, { partial: true });
  return result.errors.filter(error => error.field === 'commissionRate');
}

function describecommissionrate() {
  return describeParameter('commissionRate');
}

function defaultcommissionrate() {
  return createDefaultParameters()['commissionRate'];
}

const commissionrateParameter = Object.freeze({
  name: 'commissionRate',
  definition: PARAMETER_DEFINITIONS['commissionRate'],
  get: getcommissionrate,
  set: setcommissionrate,
  has: hascommissionrate,
  clear: clearcommissionrate,
  validate: validatecommissionrate,
  describe: describecommissionrate,
  defaultValue: defaultcommissionrate
});


function getbankaccount(record) {
  return record ? clone(record['bankAccount']) : undefined;
}

function setbankaccount(record, value) {
  if (!record) throw new TypeError('record is required');
  record['bankAccount'] = normalizeField('bankAccount', value);
  return record;
}

function hasbankaccount(record) {
  return Boolean(record && record['bankAccount'] !== undefined && record['bankAccount'] !== null && record['bankAccount'] !== '');
}

function clearbankaccount(record) {
  if (record) delete record['bankAccount'];
  return record;
}

function validatebankaccount(value) {
  const result = validatePayload({ 'bankAccount': value }, { partial: true });
  return result.errors.filter(error => error.field === 'bankAccount');
}

function describebankaccount() {
  return describeParameter('bankAccount');
}

function defaultbankaccount() {
  return createDefaultParameters()['bankAccount'];
}

const bankaccountParameter = Object.freeze({
  name: 'bankAccount',
  definition: PARAMETER_DEFINITIONS['bankAccount'],
  get: getbankaccount,
  set: setbankaccount,
  has: hasbankaccount,
  clear: clearbankaccount,
  validate: validatebankaccount,
  describe: describebankaccount,
  defaultValue: defaultbankaccount
});


function getpayoutschedule(record) {
  return record ? clone(record['payoutSchedule']) : undefined;
}

function setpayoutschedule(record, value) {
  if (!record) throw new TypeError('record is required');
  record['payoutSchedule'] = normalizeField('payoutSchedule', value);
  return record;
}

function haspayoutschedule(record) {
  return Boolean(record && record['payoutSchedule'] !== undefined && record['payoutSchedule'] !== null && record['payoutSchedule'] !== '');
}

function clearpayoutschedule(record) {
  if (record) delete record['payoutSchedule'];
  return record;
}

function validatepayoutschedule(value) {
  const result = validatePayload({ 'payoutSchedule': value }, { partial: true });
  return result.errors.filter(error => error.field === 'payoutSchedule');
}

function describepayoutschedule() {
  return describeParameter('payoutSchedule');
}

function defaultpayoutschedule() {
  return createDefaultParameters()['payoutSchedule'];
}

const payoutscheduleParameter = Object.freeze({
  name: 'payoutSchedule',
  definition: PARAMETER_DEFINITIONS['payoutSchedule'],
  get: getpayoutschedule,
  set: setpayoutschedule,
  has: haspayoutschedule,
  clear: clearpayoutschedule,
  validate: validatepayoutschedule,
  describe: describepayoutschedule,
  defaultValue: defaultpayoutschedule
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
  shopname: shopnameParameter,
  legalname: legalnameParameter,
  taxid: taxidParameter,
  email: emailParameter,
  phone: phoneParameter,
  status: statusParameter,
  rating: ratingParameter,
  commissionrate: commissionrateParameter,
  bankaccount: bankaccountParameter,
  payoutschedule: payoutscheduleParameter,
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
  const value = normalizeField('email', input['email']);
  const definition = PARAMETER_DEFINITIONS['email'];
  return {
    field: 'email',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'email' : 'email')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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
  const value = normalizeField('rating', input['rating']);
  const definition = PARAMETER_DEFINITIONS['rating'];
  return {
    field: 'rating',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'rating' : 'rating')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('commissionRate', input['commissionRate']);
  const definition = PARAMETER_DEFINITIONS['commissionRate'];
  return {
    field: 'commissionRate',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'commissionRate' : 'commissionRate')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('bankAccount', input['bankAccount']);
  const definition = PARAMETER_DEFINITIONS['bankAccount'];
  return {
    field: 'bankAccount',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'bankAccount' : 'bankAccount')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('payoutSchedule', input['payoutSchedule']);
  const definition = PARAMETER_DEFINITIONS['payoutSchedule'];
  return {
    field: 'payoutSchedule',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'payoutSchedule' : 'payoutSchedule')]: value }, { partial: true }).valid
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
