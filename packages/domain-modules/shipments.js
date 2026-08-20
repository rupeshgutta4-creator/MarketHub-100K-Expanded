
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'shipments';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'orderId', 'sellerId', 'carrier', 'service', 'trackingNumber', 'status', 'shippingCost', 'labelUrl', 'estimatedDelivery', 'shippedAt', 'deliveredAt', 'createdAt', 'updatedAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'orderId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'sellerId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'carrier': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'service': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'trackingNumber': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'status': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'shippingCost': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'labelUrl': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'estimatedDelivery': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'shippedAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'deliveredAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function getsellerid(record) {
  return record ? clone(record['sellerId']) : undefined;
}

function setsellerid(record, value) {
  if (!record) throw new TypeError('record is required');
  record['sellerId'] = normalizeField('sellerId', value);
  return record;
}

function hassellerid(record) {
  return Boolean(record && record['sellerId'] !== undefined && record['sellerId'] !== null && record['sellerId'] !== '');
}

function clearsellerid(record) {
  if (record) delete record['sellerId'];
  return record;
}

function validatesellerid(value) {
  const result = validatePayload({ 'sellerId': value }, { partial: true });
  return result.errors.filter(error => error.field === 'sellerId');
}

function describesellerid() {
  return describeParameter('sellerId');
}

function defaultsellerid() {
  return createDefaultParameters()['sellerId'];
}

const selleridParameter = Object.freeze({
  name: 'sellerId',
  definition: PARAMETER_DEFINITIONS['sellerId'],
  get: getsellerid,
  set: setsellerid,
  has: hassellerid,
  clear: clearsellerid,
  validate: validatesellerid,
  describe: describesellerid,
  defaultValue: defaultsellerid
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


function gettrackingnumber(record) {
  return record ? clone(record['trackingNumber']) : undefined;
}

function settrackingnumber(record, value) {
  if (!record) throw new TypeError('record is required');
  record['trackingNumber'] = normalizeField('trackingNumber', value);
  return record;
}

function hastrackingnumber(record) {
  return Boolean(record && record['trackingNumber'] !== undefined && record['trackingNumber'] !== null && record['trackingNumber'] !== '');
}

function cleartrackingnumber(record) {
  if (record) delete record['trackingNumber'];
  return record;
}

function validatetrackingnumber(value) {
  const result = validatePayload({ 'trackingNumber': value }, { partial: true });
  return result.errors.filter(error => error.field === 'trackingNumber');
}

function describetrackingnumber() {
  return describeParameter('trackingNumber');
}

function defaulttrackingnumber() {
  return createDefaultParameters()['trackingNumber'];
}

const trackingnumberParameter = Object.freeze({
  name: 'trackingNumber',
  definition: PARAMETER_DEFINITIONS['trackingNumber'],
  get: gettrackingnumber,
  set: settrackingnumber,
  has: hastrackingnumber,
  clear: cleartrackingnumber,
  validate: validatetrackingnumber,
  describe: describetrackingnumber,
  defaultValue: defaulttrackingnumber
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


function getshippingcost(record) {
  return record ? clone(record['shippingCost']) : undefined;
}

function setshippingcost(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shippingCost'] = normalizeField('shippingCost', value);
  return record;
}

function hasshippingcost(record) {
  return Boolean(record && record['shippingCost'] !== undefined && record['shippingCost'] !== null && record['shippingCost'] !== '');
}

function clearshippingcost(record) {
  if (record) delete record['shippingCost'];
  return record;
}

function validateshippingcost(value) {
  const result = validatePayload({ 'shippingCost': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shippingCost');
}

function describeshippingcost() {
  return describeParameter('shippingCost');
}

function defaultshippingcost() {
  return createDefaultParameters()['shippingCost'];
}

const shippingcostParameter = Object.freeze({
  name: 'shippingCost',
  definition: PARAMETER_DEFINITIONS['shippingCost'],
  get: getshippingcost,
  set: setshippingcost,
  has: hasshippingcost,
  clear: clearshippingcost,
  validate: validateshippingcost,
  describe: describeshippingcost,
  defaultValue: defaultshippingcost
});


function getlabelurl(record) {
  return record ? clone(record['labelUrl']) : undefined;
}

function setlabelurl(record, value) {
  if (!record) throw new TypeError('record is required');
  record['labelUrl'] = normalizeField('labelUrl', value);
  return record;
}

function haslabelurl(record) {
  return Boolean(record && record['labelUrl'] !== undefined && record['labelUrl'] !== null && record['labelUrl'] !== '');
}

function clearlabelurl(record) {
  if (record) delete record['labelUrl'];
  return record;
}

function validatelabelurl(value) {
  const result = validatePayload({ 'labelUrl': value }, { partial: true });
  return result.errors.filter(error => error.field === 'labelUrl');
}

function describelabelurl() {
  return describeParameter('labelUrl');
}

function defaultlabelurl() {
  return createDefaultParameters()['labelUrl'];
}

const labelurlParameter = Object.freeze({
  name: 'labelUrl',
  definition: PARAMETER_DEFINITIONS['labelUrl'],
  get: getlabelurl,
  set: setlabelurl,
  has: haslabelurl,
  clear: clearlabelurl,
  validate: validatelabelurl,
  describe: describelabelurl,
  defaultValue: defaultlabelurl
});


function getestimateddelivery(record) {
  return record ? clone(record['estimatedDelivery']) : undefined;
}

function setestimateddelivery(record, value) {
  if (!record) throw new TypeError('record is required');
  record['estimatedDelivery'] = normalizeField('estimatedDelivery', value);
  return record;
}

function hasestimateddelivery(record) {
  return Boolean(record && record['estimatedDelivery'] !== undefined && record['estimatedDelivery'] !== null && record['estimatedDelivery'] !== '');
}

function clearestimateddelivery(record) {
  if (record) delete record['estimatedDelivery'];
  return record;
}

function validateestimateddelivery(value) {
  const result = validatePayload({ 'estimatedDelivery': value }, { partial: true });
  return result.errors.filter(error => error.field === 'estimatedDelivery');
}

function describeestimateddelivery() {
  return describeParameter('estimatedDelivery');
}

function defaultestimateddelivery() {
  return createDefaultParameters()['estimatedDelivery'];
}

const estimateddeliveryParameter = Object.freeze({
  name: 'estimatedDelivery',
  definition: PARAMETER_DEFINITIONS['estimatedDelivery'],
  get: getestimateddelivery,
  set: setestimateddelivery,
  has: hasestimateddelivery,
  clear: clearestimateddelivery,
  validate: validateestimateddelivery,
  describe: describeestimateddelivery,
  defaultValue: defaultestimateddelivery
});


function getshippedat(record) {
  return record ? clone(record['shippedAt']) : undefined;
}

function setshippedat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['shippedAt'] = normalizeField('shippedAt', value);
  return record;
}

function hasshippedat(record) {
  return Boolean(record && record['shippedAt'] !== undefined && record['shippedAt'] !== null && record['shippedAt'] !== '');
}

function clearshippedat(record) {
  if (record) delete record['shippedAt'];
  return record;
}

function validateshippedat(value) {
  const result = validatePayload({ 'shippedAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'shippedAt');
}

function describeshippedat() {
  return describeParameter('shippedAt');
}

function defaultshippedat() {
  return createDefaultParameters()['shippedAt'];
}

const shippedatParameter = Object.freeze({
  name: 'shippedAt',
  definition: PARAMETER_DEFINITIONS['shippedAt'],
  get: getshippedat,
  set: setshippedat,
  has: hasshippedat,
  clear: clearshippedat,
  validate: validateshippedat,
  describe: describeshippedat,
  defaultValue: defaultshippedat
});


function getdeliveredat(record) {
  return record ? clone(record['deliveredAt']) : undefined;
}

function setdeliveredat(record, value) {
  if (!record) throw new TypeError('record is required');
  record['deliveredAt'] = normalizeField('deliveredAt', value);
  return record;
}

function hasdeliveredat(record) {
  return Boolean(record && record['deliveredAt'] !== undefined && record['deliveredAt'] !== null && record['deliveredAt'] !== '');
}

function cleardeliveredat(record) {
  if (record) delete record['deliveredAt'];
  return record;
}

function validatedeliveredat(value) {
  const result = validatePayload({ 'deliveredAt': value }, { partial: true });
  return result.errors.filter(error => error.field === 'deliveredAt');
}

function describedeliveredat() {
  return describeParameter('deliveredAt');
}

function defaultdeliveredat() {
  return createDefaultParameters()['deliveredAt'];
}

const deliveredatParameter = Object.freeze({
  name: 'deliveredAt',
  definition: PARAMETER_DEFINITIONS['deliveredAt'],
  get: getdeliveredat,
  set: setdeliveredat,
  has: hasdeliveredat,
  clear: cleardeliveredat,
  validate: validatedeliveredat,
  describe: describedeliveredat,
  defaultValue: defaultdeliveredat
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
  orderid: orderidParameter,
  sellerid: selleridParameter,
  carrier: carrierParameter,
  service: serviceParameter,
  trackingnumber: trackingnumberParameter,
  status: statusParameter,
  shippingcost: shippingcostParameter,
  labelurl: labelurlParameter,
  estimateddelivery: estimateddeliveryParameter,
  shippedat: shippedatParameter,
  deliveredat: deliveredatParameter,
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

function parameterPolicy_2(input = {}) {
  const value = normalizeField('sellerId', input['sellerId']);
  const definition = PARAMETER_DEFINITIONS['sellerId'];
  return {
    field: 'sellerId',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'sellerId' : 'sellerId')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_3(input = {}) {
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

function parameterPolicy_4(input = {}) {
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

function parameterPolicy_5(input = {}) {
  const value = normalizeField('trackingNumber', input['trackingNumber']);
  const definition = PARAMETER_DEFINITIONS['trackingNumber'];
  return {
    field: 'trackingNumber',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'trackingNumber' : 'trackingNumber')]: value }, { partial: true }).valid
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
  const value = normalizeField('shippingCost', input['shippingCost']);
  const definition = PARAMETER_DEFINITIONS['shippingCost'];
  return {
    field: 'shippingCost',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shippingCost' : 'shippingCost')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('labelUrl', input['labelUrl']);
  const definition = PARAMETER_DEFINITIONS['labelUrl'];
  return {
    field: 'labelUrl',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'labelUrl' : 'labelUrl')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('estimatedDelivery', input['estimatedDelivery']);
  const definition = PARAMETER_DEFINITIONS['estimatedDelivery'];
  return {
    field: 'estimatedDelivery',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'estimatedDelivery' : 'estimatedDelivery')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_10(input = {}) {
  const value = normalizeField('shippedAt', input['shippedAt']);
  const definition = PARAMETER_DEFINITIONS['shippedAt'];
  return {
    field: 'shippedAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'shippedAt' : 'shippedAt')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_11(input = {}) {
  const value = normalizeField('deliveredAt', input['deliveredAt']);
  const definition = PARAMETER_DEFINITIONS['deliveredAt'];
  return {
    field: 'deliveredAt',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'deliveredAt' : 'deliveredAt')]: value }, { partial: true }).valid
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
