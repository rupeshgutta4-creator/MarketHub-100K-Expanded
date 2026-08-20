
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'inventory';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'productId', 'variantId', 'warehouseId', 'onHand', 'reserved', 'available', 'reorderPoint', 'reorderQuantity', 'unitCost', 'batchNumber', 'expiryDate', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'variantId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'warehouseId': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'onHand': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'reserved': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'available': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'reorderPoint': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'reorderQuantity': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'unitCost': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'batchNumber': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'expiryDate': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getvariantid(record) {
  return record ? clone(record['variantId']) : undefined;
}

function setvariantid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['variantId'] = normalizeField('variantId', value);
  return record;
}

function hasvariantid(record) {
  return Boolean(record && record['variantId'] !== undefined && record['variantId'] !== null && record['variantId'] !== '');
}

function clearvariantid(record) {
  if (record) delete record['variantId'];
  return record;
}

function validatevariantid(value) {
  const result = validatePayload({ 'variantId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'variantId');
}

function describevariantid() {
  return describeParameter('variantId');
}

function defaultvariantid() {
  return createDefaultParameters()['variantId'];
}

const variantidParameter = Object.freeze({
  name: 'variantId',
  definition: PARAMETER_DEFINITIONS['variantId'],
  get: getvariantid,
  set: setvariantid,
  has: hasvariantid,
  clear: clearvariantid,
  validate: validatevariantid,
  describe: describevariantid,
  defaultValue: defaultvariantid
});


function getwarehouseid(record) {
  return record ? clone(record['warehouseId']) : undefined;
}

function setwarehouseid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['warehouseId'] = normalizeField('warehouseId', value);
  return record;
}

function haswarehouseid(record) {
  return Boolean(record && record['warehouseId'] !== undefined && record['warehouseId'] !== null && record['warehouseId'] !== '');
}

function clearwarehouseid(record) {
  if (record) delete record['warehouseId'];
  return record;
}

function validatewarehouseid(value) {
  const result = validatePayload({ 'warehouseId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'warehouseId');
}

function describewarehouseid() {
  return describeParameter('warehouseId');
}

function defaultwarehouseid() {
  return createDefaultParameters()['warehouseId'];
}

const warehouseidParameter = Object.freeze({
  name: 'warehouseId',
  definition: PARAMETER_DEFINITIONS['warehouseId'],
  get: getwarehouseid,
  set: setwarehouseid,
  has: haswarehouseid,
  clear: clearwarehouseid,
  validate: validatewarehouseid,
  describe: describewarehouseid,
  defaultValue: defaultwarehouseid
});


function getonhand(record) {
  return record ? clone(record['onHand']) : undefined;
}

function setonhand(record, value) {
  if (!record) throw new TypeError('record is required');
  record['onHand'] = normalizeField('onHand', value);
  return record;
}

function hasonhand(record) {
  return Boolean(record && record['onHand'] !== undefined && record['onHand'] !== null && record['onHand'] !== '');
}

function clearonhand(record) {
  if (record) delete record['onHand'];
  return record;
}

function validateonhand(value) {
  const result = validatePayload({ 'onHand': value }, { partial: true });
  return result.errors.filter(error => error.field === 'onHand');
}

function describeonhand() {
  return describeParameter('onHand');
}

function defaultonhand() {
  return createDefaultParameters()['onHand'];
}

const onhandParameter = Object.freeze({
  name: 'onHand',
  definition: PARAMETER_DEFINITIONS['onHand'],
  get: getonhand,
  set: setonhand,
  has: hasonhand,
  clear: clearonhand,
  validate: validateonhand,
  describe: describeonhand,
  defaultValue: defaultonhand
});


function getreserved(record) {
  return record ? clone(record['reserved']) : undefined;
}

function setreserved(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reserved'] = normalizeField('reserved', value);
  return record;
}

function hasreserved(record) {
  return Boolean(record && record['reserved'] !== undefined && record['reserved'] !== null && record['reserved'] !== '');
}

function clearreserved(record) {
  if (record) delete record['reserved'];
  return record;
}

function validatereserved(value) {
  const result = validatePayload({ 'reserved': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reserved');
}

function describereserved() {
  return describeParameter('reserved');
}

function defaultreserved() {
  return createDefaultParameters()['reserved'];
}

const reservedParameter = Object.freeze({
  name: 'reserved',
  definition: PARAMETER_DEFINITIONS['reserved'],
  get: getreserved,
  set: setreserved,
  has: hasreserved,
  clear: clearreserved,
  validate: validatereserved,
  describe: describereserved,
  defaultValue: defaultreserved
});


function getavailable(record) {
  return record ? clone(record['available']) : undefined;
}

function setavailable(record, value) {
  if (!record) throw new TypeError('record is required');
  record['available'] = normalizeField('available', value);
  return record;
}

function hasavailable(record) {
  return Boolean(record && record['available'] !== undefined && record['available'] !== null && record['available'] !== '');
}

function clearavailable(record) {
  if (record) delete record['available'];
  return record;
}

function validateavailable(value) {
  const result = validatePayload({ 'available': value }, { partial: true });
  return result.errors.filter(error => error.field === 'available');
}

function describeavailable() {
  return describeParameter('available');
}

function defaultavailable() {
  return createDefaultParameters()['available'];
}

const availableParameter = Object.freeze({
  name: 'available',
  definition: PARAMETER_DEFINITIONS['available'],
  get: getavailable,
  set: setavailable,
  has: hasavailable,
  clear: clearavailable,
  validate: validateavailable,
  describe: describeavailable,
  defaultValue: defaultavailable
});


function getreorderpoint(record) {
  return record ? clone(record['reorderPoint']) : undefined;
}

function setreorderpoint(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reorderPoint'] = normalizeField('reorderPoint', value);
  return record;
}

function hasreorderpoint(record) {
  return Boolean(record && record['reorderPoint'] !== undefined && record['reorderPoint'] !== null && record['reorderPoint'] !== '');
}

function clearreorderpoint(record) {
  if (record) delete record['reorderPoint'];
  return record;
}

function validatereorderpoint(value) {
  const result = validatePayload({ 'reorderPoint': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reorderPoint');
}

function describereorderpoint() {
  return describeParameter('reorderPoint');
}

function defaultreorderpoint() {
  return createDefaultParameters()['reorderPoint'];
}

const reorderpointParameter = Object.freeze({
  name: 'reorderPoint',
  definition: PARAMETER_DEFINITIONS['reorderPoint'],
  get: getreorderpoint,
  set: setreorderpoint,
  has: hasreorderpoint,
  clear: clearreorderpoint,
  validate: validatereorderpoint,
  describe: describereorderpoint,
  defaultValue: defaultreorderpoint
});


function getreorderquantity(record) {
  return record ? clone(record['reorderQuantity']) : undefined;
}

function setreorderquantity(record, value) {
  if (!record) throw new TypeError('record is required');
  record['reorderQuantity'] = normalizeField('reorderQuantity', value);
  return record;
}

function hasreorderquantity(record) {
  return Boolean(record && record['reorderQuantity'] !== undefined && record['reorderQuantity'] !== null && record['reorderQuantity'] !== '');
}

function clearreorderquantity(record) {
  if (record) delete record['reorderQuantity'];
  return record;
}

function validatereorderquantity(value) {
  const result = validatePayload({ 'reorderQuantity': value }, { partial: true });
  return result.errors.filter(error => error.field === 'reorderQuantity');
}

function describereorderquantity() {
  return describeParameter('reorderQuantity');
}

function defaultreorderquantity() {
  return createDefaultParameters()['reorderQuantity'];
}

const reorderquantityParameter = Object.freeze({
  name: 'reorderQuantity',
  definition: PARAMETER_DEFINITIONS['reorderQuantity'],
  get: getreorderquantity,
  set: setreorderquantity,
  has: hasreorderquantity,
  clear: clearreorderquantity,
  validate: validatereorderquantity,
  describe: describereorderquantity,
  defaultValue: defaultreorderquantity
});


function getunitcost(record) {
  return record ? clone(record['unitCost']) : undefined;
}

function setunitcost(record, value) {
  if (!record) throw new TypeError('record is required');
  record['unitCost'] = normalizeField('unitCost', value);
  return record;
}

function hasunitcost(record) {
  return Boolean(record && record['unitCost'] !== undefined && record['unitCost'] !== null && record['unitCost'] !== '');
}

function clearunitcost(record) {
  if (record) delete record['unitCost'];
  return record;
}

function validateunitcost(value) {
  const result = validatePayload({ 'unitCost': value }, { partial: true });
  return result.errors.filter(error => error.field === 'unitCost');
}

function describeunitcost() {
  return describeParameter('unitCost');
}

function defaultunitcost() {
  return createDefaultParameters()['unitCost'];
}

const unitcostParameter = Object.freeze({
  name: 'unitCost',
  definition: PARAMETER_DEFINITIONS['unitCost'],
  get: getunitcost,
  set: setunitcost,
  has: hasunitcost,
  clear: clearunitcost,
  validate: validateunitcost,
  describe: describeunitcost,
  defaultValue: defaultunitcost
});


function getbatchnumber(record) {
  return record ? clone(record['batchNumber']) : undefined;
}

function setbatchnumber(record, value) {
  if (!record) throw new TypeError('record is required');
  record['batchNumber'] = normalizeField('batchNumber', value);
  return record;
}

function hasbatchnumber(record) {
  return Boolean(record && record['batchNumber'] !== undefined && record['batchNumber'] !== null && record['batchNumber'] !== '');
}

function clearbatchnumber(record) {
  if (record) delete record['batchNumber'];
  return record;
}

function validatebatchnumber(value) {
  const result = validatePayload({ 'batchNumber': value }, { partial: true });
  return result.errors.filter(error => error.field === 'batchNumber');
}

function describebatchnumber() {
  return describeParameter('batchNumber');
}

function defaultbatchnumber() {
  return createDefaultParameters()['batchNumber'];
}

const batchnumberParameter = Object.freeze({
  name: 'batchNumber',
  definition: PARAMETER_DEFINITIONS['batchNumber'],
  get: getbatchnumber,
  set: setbatchnumber,
  has: hasbatchnumber,
  clear: clearbatchnumber,
  validate: validatebatchnumber,
  describe: describebatchnumber,
  defaultValue: defaultbatchnumber
});


function getexpirydate(record) {
  return record ? clone(record['expiryDate']) : undefined;
}

function setexpirydate(record, value) {
  if (!record) throw new TypeError('record is required');
  record['expiryDate'] = normalizeField('expiryDate', value);
  return record;
}

function hasexpirydate(record) {
  return Boolean(record && record['expiryDate'] !== undefined && record['expiryDate'] !== null && record['expiryDate'] !== '');
}

function clearexpirydate(record) {
  if (record) delete record['expiryDate'];
  return record;
}

function validateexpirydate(value) {
  const result = validatePayload({ 'expiryDate': value }, { partial: true });
  return result.errors.filter(error => error.field === 'expiryDate');
}

function describeexpirydate() {
  return describeParameter('expiryDate');
}

function defaultexpirydate() {
  return createDefaultParameters()['expiryDate'];
}

const expirydateParameter = Object.freeze({
  name: 'expiryDate',
  definition: PARAMETER_DEFINITIONS['expiryDate'],
  get: getexpirydate,
  set: setexpirydate,
  has: hasexpirydate,
  clear: clearexpirydate,
  validate: validateexpirydate,
  describe: describeexpirydate,
  defaultValue: defaultexpirydate
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
  variantid: variantidParameter,
  warehouseid: warehouseidParameter,
  onhand: onhandParameter,
  reserved: reservedParameter,
  available: availableParameter,
  reorderpoint: reorderpointParameter,
  reorderquantity: reorderquantityParameter,
  unitcost: unitcostParameter,
  batchnumber: batchnumberParameter,
  expirydate: expirydateParameter,
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
  const value = normalizeField('variantId', input['variantId']);
  const definition = PARAMETER_DEFINITIONS['variantId'];
  return {
    field: 'variantId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'variantId' : 'variantId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
  const value = normalizeField('warehouseId', input['warehouseId']);
  const definition = PARAMETER_DEFINITIONS['warehouseId'];
  return {
    field: 'warehouseId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'warehouseId' : 'warehouseId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('onHand', input['onHand']);
  const definition = PARAMETER_DEFINITIONS['onHand'];
  return {
    field: 'onHand',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'onHand' : 'onHand')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('reserved', input['reserved']);
  const definition = PARAMETER_DEFINITIONS['reserved'];
  return {
    field: 'reserved',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reserved' : 'reserved')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('available', input['available']);
  const definition = PARAMETER_DEFINITIONS['available'];
  return {
    field: 'available',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'available' : 'available')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('reorderPoint', input['reorderPoint']);
  const definition = PARAMETER_DEFINITIONS['reorderPoint'];
  return {
    field: 'reorderPoint',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reorderPoint' : 'reorderPoint')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('reorderQuantity', input['reorderQuantity']);
  const definition = PARAMETER_DEFINITIONS['reorderQuantity'];
  return {
    field: 'reorderQuantity',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'reorderQuantity' : 'reorderQuantity')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('unitCost', input['unitCost']);
  const definition = PARAMETER_DEFINITIONS['unitCost'];
  return {
    field: 'unitCost',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'unitCost' : 'unitCost')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('batchNumber', input['batchNumber']);
  const definition = PARAMETER_DEFINITIONS['batchNumber'];
  return {
    field: 'batchNumber',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'batchNumber' : 'batchNumber')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('expiryDate', input['expiryDate']);
  const definition = PARAMETER_DEFINITIONS['expiryDate'];
  return {
    field: 'expiryDate',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'expiryDate' : 'expiryDate')]: value }, { partial: true }).valid
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
