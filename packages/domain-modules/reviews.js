
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'reviews';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'productId', 'buyerId', 'orderId', 'rating', 'title', 'body', 'images', 'verifiedPurchase', 'status', 'sellerReply', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'buyerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'rating': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'title': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'body': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'images': Object.freeze({'type': 'array', 'required': false, 'nullable': true}),
  'verifiedPurchase': Object.freeze({'type': 'boolean', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'sellerReply': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getproductid(record) {
  return record ? clone(record['productId']) : undefined;
}

function setproductid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['productId'] = normalizeField('productId', value);
  return record;
}

function hasproductid(record) {
  return Boolean(record && record['productId'] !== undefined && record['productId'] !== null && record['productId'] !== '');
}

function clearproductid(record) {
  if (record) delete record['productId'];
  return record;
}

function validateproductid(value) {
  const result = validatePayload({ 'productId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'productId');
}

function describeproductid() {
  return describeParameter('productId');
}

function defaultproductid() {
  return createDefaultParameters()['productId'];
}

const productidParameter = Object.freeze({
  name: 'productId',
  definition: PARAMETER_DEFINITIONS['productId'],
  get: getproductid,
  set: setproductid,
  has: hasproductid,
  clear: clearproductid,
  validate: validateproductid,
  describe: describeproductid,
  defaultValue: defaultproductid
});


function getbuyerid(record) {
  return record ? clone(record['buyerId']) : undefined;
}

function setbuyerid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['buyerId'] = normalizeField('buyerId', value);
  return record;
}

function hasbuyerid(record) {
  return Boolean(record && record['buyerId'] !== undefined && record['buyerId'] !== null && record['buyerId'] !== '');
}

function clearbuyerid(record) {
  if (record) delete record['buyerId'];
  return record;
}

function validatebuyerid(value) {
  const result = validatePayload({ 'buyerId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'buyerId');
}

function describebuyerid() {
  return describeParameter('buyerId');
}

function defaultbuyerid() {
  return createDefaultParameters()['buyerId'];
}

const buyeridParameter = Object.freeze({
  name: 'buyerId',
  definition: PARAMETER_DEFINITIONS['buyerId'],
  get: getbuyerid,
  set: setbuyerid,
  has: hasbuyerid,
  clear: clearbuyerid,
  validate: validatebuyerid,
  describe: describebuyerid,
  defaultValue: defaultbuyerid
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


function gettitle(record) {
  return record ? clone(record['title']) : undefined;
}

function settitle(record, value) {
  if (!record) throw new TypeError('record is required');
  record['title'] = normalizeField('title', value);
  return record;
}

function hastitle(record) {
  return Boolean(record && record['title'] !== undefined && record['title'] !== null && record['title'] !== '');
}

function cleartitle(record) {
  if (record) delete record['title'];
  return record;
}

function validatetitle(value) {
  const result = validatePayload({ 'title': value }, { partial: true });
  return result.errors.filter(error => error.field === 'title');
}

function describetitle() {
  return describeParameter('title');
}

function defaulttitle() {
  return createDefaultParameters()['title'];
}

const titleParameter = Object.freeze({
  name: 'title',
  definition: PARAMETER_DEFINITIONS['title'],
  get: gettitle,
  set: settitle,
  has: hastitle,
  clear: cleartitle,
  validate: validatetitle,
  describe: describetitle,
  defaultValue: defaulttitle
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


function getimages(record) {
  return record ? clone(record['images']) : undefined;
}

function setimages(record, value) {
  if (!record) throw new TypeError('record is required');
  record['images'] = normalizeField('images', value);
  return record;
}

function hasimages(record) {
  return Boolean(record && record['images'] !== undefined && record['images'] !== null && record['images'] !== '');
}

function clearimages(record) {
  if (record) delete record['images'];
  return record;
}

function validateimages(value) {
  const result = validatePayload({ 'images': value }, { partial: true });
  return result.errors.filter(error => error.field === 'images');
}

function describeimages() {
  return describeParameter('images');
}

function defaultimages() {
  return createDefaultParameters()['images'];
}

const imagesParameter = Object.freeze({
  name: 'images',
  definition: PARAMETER_DEFINITIONS['images'],
  get: getimages,
  set: setimages,
  has: hasimages,
  clear: clearimages,
  validate: validateimages,
  describe: describeimages,
  defaultValue: defaultimages
});


function getverifiedpurchase(record) {
  return record ? clone(record['verifiedPurchase']) : undefined;
}

function setverifiedpurchase(record, value) {
  if (!record) throw new TypeError('record is required');
  record['verifiedPurchase'] = normalizeField('verifiedPurchase', value);
  return record;
}

function hasverifiedpurchase(record) {
  return Boolean(record && record['verifiedPurchase'] !== undefined && record['verifiedPurchase'] !== null && record['verifiedPurchase'] !== '');
}

function clearverifiedpurchase(record) {
  if (record) delete record['verifiedPurchase'];
  return record;
}

function validateverifiedpurchase(value) {
  const result = validatePayload({ 'verifiedPurchase': value }, { partial: true });
  return result.errors.filter(error => error.field === 'verifiedPurchase');
}

function describeverifiedpurchase() {
  return describeParameter('verifiedPurchase');
}

function defaultverifiedpurchase() {
  return createDefaultParameters()['verifiedPurchase'];
}

const verifiedpurchaseParameter = Object.freeze({
  name: 'verifiedPurchase',
  definition: PARAMETER_DEFINITIONS['verifiedPurchase'],
  get: getverifiedpurchase,
  set: setverifiedpurchase,
  has: hasverifiedpurchase,
  clear: clearverifiedpurchase,
  validate: validateverifiedpurchase,
  describe: describeverifiedpurchase,
  defaultValue: defaultverifiedpurchase
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


function getsellerreply(record) {
  return record ? clone(record['sellerReply']) : undefined;
}

function setsellerreply(record, value) {
  if (!record) throw new TypeError('record is required');
  record['sellerReply'] = normalizeField('sellerReply', value);
  return record;
}

function hassellerreply(record) {
  return Boolean(record && record['sellerReply'] !== undefined && record['sellerReply'] !== null && record['sellerReply'] !== '');
}

function clearsellerreply(record) {
  if (record) delete record['sellerReply'];
  return record;
}

function validatesellerreply(value) {
  const result = validatePayload({ 'sellerReply': value }, { partial: true });
  return result.errors.filter(error => error.field === 'sellerReply');
}

function describesellerreply() {
  return describeParameter('sellerReply');
}

function defaultsellerreply() {
  return createDefaultParameters()['sellerReply'];
}

const sellerreplyParameter = Object.freeze({
  name: 'sellerReply',
  definition: PARAMETER_DEFINITIONS['sellerReply'],
  get: getsellerreply,
  set: setsellerreply,
  has: hassellerreply,
  clear: clearsellerreply,
  validate: validatesellerreply,
  describe: describesellerreply,
  defaultValue: defaultsellerreply
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
  productid: productidParameter,
  buyerid: buyeridParameter,
  orderid: orderidParameter,
  rating: ratingParameter,
  title: titleParameter,
  body: bodyParameter,
  images: imagesParameter,
  verifiedpurchase: verifiedpurchaseParameter,
  status: statusParameter,
  sellerreply: sellerreplyParameter,
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
  const value = normalizeField('productId', input['productId']);
  const definition = PARAMETER_DEFINITIONS['productId'];
  return {
    field: 'productId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'productId' : 'productId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_2(input = {}) {
  const value = normalizeField('buyerId', input['buyerId']);
  const definition = PARAMETER_DEFINITIONS['buyerId'];
  return {
    field: 'buyerId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'buyerId' : 'buyerId')]: value }, { partial: true }).valid
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

function parameterPolicy_5(input = {}) {
  const value = normalizeField('title', input['title']);
  const definition = PARAMETER_DEFINITIONS['title'];
  return {
    field: 'title',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'title' : 'title')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
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

function parameterPolicy_7(input = {}) {
  const value = normalizeField('images', input['images']);
  const definition = PARAMETER_DEFINITIONS['images'];
  return {
    field: 'images',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'images' : 'images')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('verifiedPurchase', input['verifiedPurchase']);
  const definition = PARAMETER_DEFINITIONS['verifiedPurchase'];
  return {
    field: 'verifiedPurchase',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'verifiedPurchase' : 'verifiedPurchase')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
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

function parameterPolicy_10(input = {}) {
  const value = normalizeField('sellerReply', input['sellerReply']);
  const definition = PARAMETER_DEFINITIONS['sellerReply'];
  return {
    field: 'sellerReply',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'sellerReply' : 'sellerReply')]: value }, { partial: true }).valid
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
