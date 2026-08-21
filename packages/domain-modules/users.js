
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'users';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'phone', 'role', 'status', 'avatarUrl', 'lastLoginAt', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'email': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'passwordHash': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'firstName': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'lastName': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'phone': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'role': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'avatarUrl': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'lastLoginAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getpasswordhash(record) {
  return record ? clone(record['passwordHash']) : undefined;
}

function setpasswordhash(record, value) {
  if (!record) throw new TypeError('record is required');
  record['passwordHash'] = normalizeField('passwordHash', value);
  return record;
}

function haspasswordhash(record) {
  return Boolean(record && record['passwordHash'] !== undefined && record['passwordHash'] !== null && record['passwordHash'] !== '');
}

function clearpasswordhash(record) {
  if (record) delete record['passwordHash'];
  return record;
}

function validatepasswordhash(value) {
  const result = validatePayload({ 'passwordHash': value }, { partial: true });
  return result.errors.filter(error => error.field === 'passwordHash');
}

function describepasswordhash() {
  return describeParameter('passwordHash');
}

function defaultpasswordhash() {
  return createDefaultParameters()['passwordHash'];
}

const passwordhashParameter = Object.freeze({
  name: 'passwordHash',
  definition: PARAMETER_DEFINITIONS['passwordHash'],
  get: getpasswordhash,
  set: setpasswordhash,
  has: haspasswordhash,
  clear: clearpasswordhash,
  validate: validatepasswordhash,
  describe: describepasswordhash,
  defaultValue: defaultpasswordhash
});


function getfirstname(record) {
  return record ? clone(record['firstName']) : undefined;
}

function setfirstname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['firstName'] = normalizeField('firstName', value);
  return record;
}

function hasfirstname(record) {
  return Boolean(record && record['firstName'] !== undefined && record['firstName'] !== null && record['firstName'] !== '');
}

function clearfirstname(record) {
  if (record) delete record['firstName'];
  return record;
}

function validatefirstname(value) {
  const result = validatePayload({ 'firstName': value }, { partial: true });
  return result.errors.filter(error => error.field === 'firstName');
}

function describefirstname() {
  return describeParameter('firstName');
}

function defaultfirstname() {
  return createDefaultParameters()['firstName'];
}

const firstnameParameter = Object.freeze({
  name: 'firstName',
  definition: PARAMETER_DEFINITIONS['firstName'],
  get: getfirstname,
  set: setfirstname,
  has: hasfirstname,
  clear: clearfirstname,
  validate: validatefirstname,
  describe: describefirstname,
  defaultValue: defaultfirstname
});


function getlastname(record) {
  return record ? clone(record['lastName']) : undefined;
}

function setlastname(record, value) {
  if (!record) throw new TypeError('record is required');
  record['lastName'] = normalizeField('lastName', value);
  return record;
}

function haslastname(record) {
  return Boolean(record && record['lastName'] !== undefined && record['lastName'] !== null && record['lastName'] !== '');
}

function clearlastname(record) {
  if (record) delete record['lastName'];
  return record;
}

function validatelastname(value) {
  const result = validatePayload({ 'lastName': value }, { partial: true });
  return result.errors.filter(error => error.field === 'lastName');
}

function describelastname() {
  return describeParameter('lastName');
}

function defaultlastname() {
  return createDefaultParameters()['lastName'];
}

const lastnameParameter = Object.freeze({
  name: 'lastName',
  definition: PARAMETER_DEFINITIONS['lastName'],
  get: getlastname,
  set: setlastname,
  has: haslastname,
  clear: clearlastname,
  validate: validatelastname,
  describe: describelastname,
  defaultValue: defaultlastname
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


function getrole(record) {
  return record ? clone(record['role']) : undefined;
}

function setrole(record, value) {
  if (!record) throw new TypeError('record is required');
  record['role'] = normalizeField('role', value);
  return record;
}

function hasrole(record) {
  return Boolean(record && record['role'] !== undefined && record['role'] !== null && record['role'] !== '');
}

function clearrole(record) {
  if (record) delete record['role'];
  return record;
}

function validaterole(value) {
  const result = validatePayload({ 'role': value }, { partial: true });
  return result.errors.filter(error => error.field === 'role');
}

function describerole() {
  return describeParameter('role');
}

function defaultrole() {
  return createDefaultParameters()['role'];
}

const roleParameter = Object.freeze({
  name: 'role',
  definition: PARAMETER_DEFINITIONS['role'],
  get: getrole,
  set: setrole,
  has: hasrole,
  clear: clearrole,
  validate: validaterole,
  describe: describerole,
  defaultValue: defaultrole
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


function getavatarurl(record) {
  return record ? clone(record['avatarUrl']) : undefined;
}

function setavatarurl(record, value) {
  if (!record) throw new TypeError('record is required');
  record['avatarUrl'] = normalizeField('avatarUrl', value);
  return record;
}

function hasavatarurl(record) {
  return Boolean(record && record['avatarUrl'] !== undefined && record['avatarUrl'] !== null && record['avatarUrl'] !== '');
}

function clearavatarurl(record) {
  if (record) delete record['avatarUrl'];
  return record;
}

function validateavatarurl(value) {
  const result = validatePayload({ 'avatarUrl': value }, { partial: true });
  return result.errors.filter(error => error.field === 'avatarUrl');
}

function describeavatarurl() {
  return describeParameter('avatarUrl');
}

function defaultavatarurl() {
  return createDefaultParameters()['avatarUrl'];
}

const avatarurlParameter = Object.freeze({
  name: 'avatarUrl',
  definition: PARAMETER_DEFINITIONS['avatarUrl'],
  get: getavatarurl,
  set: setavatarurl,
  has: hasavatarurl,
  clear: clearavatarurl,
  validate: validateavatarurl,
  describe: describeavatarurl,
  defaultValue: defaultavatarurl
});


function getlastloginat(record) {
  return record ? clone(record['lastLoginAt']) : undefined;
}

function setlastloginat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['lastLoginAt'] = normalizeField('lastLoginAt', value);
  return record;
}

function haslastloginat(record) {
  return Boolean(record && record['lastLoginAt'] !== undefined && record['lastLoginAt'] !== null && record['lastLoginAt'] !== '');
}

function clearlastloginat(record) {
  if (record) delete record['lastLoginAt'];
  return record;
}

function validatelastloginat(value) {
  const result = validatePayload({ 'lastLoginAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'lastLoginAt');
}

function describelastloginat() {
  return describeParameter('lastLoginAt');
}

function defaultlastloginat() {
  return createDefaultParameters()['lastLoginAt'];
}

const lastloginatParameter = Object.freeze({
  name: 'lastLoginAt',
  definition: PARAMETER_DEFINITIONS['lastLoginAt'],
  get: getlastloginat,
  set: setlastloginat,
  has: haslastloginat,
  clear: clearlastloginat,
  validate: validatelastloginat,
  describe: describelastloginat,
  defaultValue: defaultlastloginat
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
  email: emailParameter,
  passwordhash: passwordhashParameter,
  firstname: firstnameParameter,
  lastname: lastnameParameter,
  phone: phoneParameter,
  role: roleParameter,
  status: statusParameter,
  avatarurl: avatarurlParameter,
  lastloginat: lastloginatParameter,
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

function parameterPolicy_2(input = {}) {
  const value = normalizeField('passwordHash', input['passwordHash']);
  const definition = PARAMETER_DEFINITIONS['passwordHash'];
  return {
    field: 'passwordHash',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'passwordHash' : 'passwordHash')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('firstName', input['firstName']);
  const definition = PARAMETER_DEFINITIONS['firstName'];
  return {
    field: 'firstName',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'firstName' : 'firstName')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('lastName', input['lastName']);
  const definition = PARAMETER_DEFINITIONS['lastName'];
  return {
    field: 'lastName',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'lastName' : 'lastName')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
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

function parameterPolicy_6(input = {}) {
  const value = normalizeField('role', input['role']);
  const definition = PARAMETER_DEFINITIONS['role'];
  return {
    field: 'role',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'role' : 'role')]: value }, { partial: true }).valid
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
  const value = normalizeField('avatarUrl', input['avatarUrl']);
  const definition = PARAMETER_DEFINITIONS['avatarUrl'];
  return {
    field: 'avatarUrl',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'avatarUrl' : 'avatarUrl')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('lastLoginAt', input['lastLoginAt']);
  const definition = PARAMETER_DEFINITIONS['lastLoginAt'];
  return {
    field: 'lastLoginAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'lastLoginAt' : 'lastLoginAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
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

function parameterPolicy_11(input = {}) {
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
