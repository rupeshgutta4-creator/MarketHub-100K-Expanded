
'use strict';

/**
 * Enterprise domain module for MarketHub.
 * Every exported parameter has normalization, validation, accessors,
 * filtering, pagination and CRUD support. The in-memory repository is
 * intentionally deterministic and can be replaced with a database adapter.
 */

const MODULE_NAME = 'productImages';
const VERSION = '2.0.0';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;
const FIELD_NAMES = ['id', 'productId', 'variantId', 'url', 'altText', 'position', 'width', 'height', 'mimeType', 'isPrimary', 'createdAt'];
const FIELD_SET = new Set(FIELD_NAMES);

const PARAMETER_DEFINITIONS = Object.freeze({
  'id': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'productId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'variantId': Object.freeze({'type': 'string', 'required': true, 'nullable': false}),
  'url': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'altText': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'position': Object.freeze({'type': 'number', 'required': false, 'nullable': true}),
  'width': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'height': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'mimeType': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'isPrimary': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
  'createdAt': Object.freeze({'type': 'string', 'required': false, 'nullable': true}),
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


function geturl(record) {
  return record ? clone(record['url']) : undefined;
}

function seturl(record, value) {
  if (!record) throw new TypeError('record is required');
  record['url'] = normalizeField('url', value);
  return record;
}

function hasurl(record) {
  return Boolean(record && record['url'] !== undefined && record['url'] !== null && record['url'] !== '');
}

function clearurl(record) {
  if (record) delete record['url'];
  return record;
}

function validateurl(value) {
  const result = validatePayload({ 'url': value }, { partial: true });
  return result.errors.filter(error => error.field === 'url');
}

function describeurl() {
  return describeParameter('url');
}

function defaulturl() {
  return createDefaultParameters()['url'];
}

const urlParameter = Object.freeze({
  name: 'url',
  definition: PARAMETER_DEFINITIONS['url'],
  get: geturl,
  set: seturl,
  has: hasurl,
  clear: clearurl,
  validate: validateurl,
  describe: describeurl,
  defaultValue: defaulturl
});


function getalttext(record) {
  return record ? clone(record['altText']) : undefined;
}

function setalttext(record, value) {
  if (!record) throw new TypeError('record is required');
  record['altText'] = normalizeField('altText', value);
  return record;
}

function hasalttext(record) {
  return Boolean(record && record['altText'] !== undefined && record['altText'] !== null && record['altText'] !== '');
}

function clearalttext(record) {
  if (record) delete record['altText'];
  return record;
}

function validatealttext(value) {
  const result = validatePayload({ 'altText': value }, { partial: true });
  return result.errors.filter(error => error.field === 'altText');
}

function describealttext() {
  return describeParameter('altText');
}

function defaultalttext() {
  return createDefaultParameters()['altText'];
}

const alttextParameter = Object.freeze({
  name: 'altText',
  definition: PARAMETER_DEFINITIONS['altText'],
  get: getalttext,
  set: setalttext,
  has: hasalttext,
  clear: clearalttext,
  validate: validatealttext,
  describe: describealttext,
  defaultValue: defaultalttext
});


function getposition(record) {
  return record ? clone(record['position']) : undefined;
}

function setposition(record, value) {
  if (!record) throw new TypeError('record is required');
  record['position'] = normalizeField('position', value);
  return record;
}

function hasposition(record) {
  return Boolean(record && record['position'] !== undefined && record['position'] !== null && record['position'] !== '');
}

function clearposition(record) {
  if (record) delete record['position'];
  return record;
}

function validateposition(value) {
  const result = validatePayload({ 'position': value }, { partial: true });
  return result.errors.filter(error => error.field === 'position');
}

function describeposition() {
  return describeParameter('position');
}

function defaultposition() {
  return createDefaultParameters()['position'];
}

const positionParameter = Object.freeze({
  name: 'position',
  definition: PARAMETER_DEFINITIONS['position'],
  get: getposition,
  set: setposition,
  has: hasposition,
  clear: clearposition,
  validate: validateposition,
  describe: describeposition,
  defaultValue: defaultposition
});


function getwidth(record) {
  return record ? clone(record['width']) : undefined;
}

function setwidth(record, value) {
  if (!record) throw new TypeError('record is required');
  record['width'] = normalizeField('width', value);
  return record;
}

function haswidth(record) {
  return Boolean(record && record['width'] !== undefined && record['width'] !== null && record['width'] !== '');
}

function clearwidth(record) {
  if (record) delete record['width'];
  return record;
}

function validatewidth(value) {
  const result = validatePayload({ 'width': value }, { partial: true });
  return result.errors.filter(error => error.field === 'width');
}

function describewidth() {
  return describeParameter('width');
}

function defaultwidth() {
  return createDefaultParameters()['width'];
}

const widthParameter = Object.freeze({
  name: 'width',
  definition: PARAMETER_DEFINITIONS['width'],
  get: getwidth,
  set: setwidth,
  has: haswidth,
  clear: clearwidth,
  validate: validatewidth,
  describe: describewidth,
  defaultValue: defaultwidth
});


function getheight(record) {
  return record ? clone(record['height']) : undefined;
}

function setheight(record, value) {
  if (!record) throw new TypeError('record is required');
  record['height'] = normalizeField('height', value);
  return record;
}

function hasheight(record) {
  return Boolean(record && record['height'] !== undefined && record['height'] !== null && record['height'] !== '');
}

function clearheight(record) {
  if (record) delete record['height'];
  return record;
}

function validateheight(value) {
  const result = validatePayload({ 'height': value }, { partial: true });
  return result.errors.filter(error => error.field === 'height');
}

function describeheight() {
  return describeParameter('height');
}

function defaultheight() {
  return createDefaultParameters()['height'];
}

const heightParameter = Object.freeze({
  name: 'height',
  definition: PARAMETER_DEFINITIONS['height'],
  get: getheight,
  set: setheight,
  has: hasheight,
  clear: clearheight,
  validate: validateheight,
  describe: describeheight,
  defaultValue: defaultheight
});


function getmimetype(record) {
  return record ? clone(record['mimeType']) : undefined;
}

function setmimetype(record, value) {
  if (!record) throw new TypeError('record is required');
  record['mimeType'] = normalizeField('mimeType', value);
  return record;
}

function hasmimetype(record) {
  return Boolean(record && record['mimeType'] !== undefined && record['mimeType'] !== null && record['mimeType'] !== '');
}

function clearmimetype(record) {
  if (record) delete record['mimeType'];
  return record;
}

function validatemimetype(value) {
  const result = validatePayload({ 'mimeType': value }, { partial: true });
  return result.errors.filter(error => error.field === 'mimeType');
}

function describemimetype() {
  return describeParameter('mimeType');
}

function defaultmimetype() {
  return createDefaultParameters()['mimeType'];
}

const mimetypeParameter = Object.freeze({
  name: 'mimeType',
  definition: PARAMETER_DEFINITIONS['mimeType'],
  get: getmimetype,
  set: setmimetype,
  has: hasmimetype,
  clear: clearmimetype,
  validate: validatemimetype,
  describe: describemimetype,
  defaultValue: defaultmimetype
});


function getisprimary(record) {
  return record ? clone(record['isPrimary']) : undefined;
}

function setisprimary(record, value) {
  if (!record) throw new TypeError('record is required');
  record['isPrimary'] = normalizeField('isPrimary', value);
  return record;
}

function hasisprimary(record) {
  return Boolean(record && record['isPrimary'] !== undefined && record['isPrimary'] !== null && record['isPrimary'] !== '');
}

function clearisprimary(record) {
  if (record) delete record['isPrimary'];
  return record;
}

function validateisprimary(value) {
  const result = validatePayload({ 'isPrimary': value }, { partial: true });
  return result.errors.filter(error => error.field === 'isPrimary');
}

function describeisprimary() {
  return describeParameter('isPrimary');
}

function defaultisprimary() {
  return createDefaultParameters()['isPrimary'];
}

const isprimaryParameter = Object.freeze({
  name: 'isPrimary',
  definition: PARAMETER_DEFINITIONS['isPrimary'],
  get: getisprimary,
  set: setisprimary,
  has: hasisprimary,
  clear: clearisprimary,
  validate: validateisprimary,
  describe: describeisprimary,
  defaultValue: defaultisprimary
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


const PARAMETERS = Object.freeze({
  id: idParameter,
  productid: productidParameter,
  variantid: variantidParameter,
  url: urlParameter,
  alttext: alttextParameter,
  position: positionParameter,
  width: widthParameter,
  height: heightParameter,
  mimetype: mimetypeParameter,
  isprimary: isprimaryParameter,
  createdat: createdatParameter,
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
  const value = normalizeField('url', input['url']);
  const definition = PARAMETER_DEFINITIONS['url'];
  return {
    field: 'url',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'url' : 'url')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_4(input = {}) {
  const value = normalizeField('altText', input['altText']);
  const definition = PARAMETER_DEFINITIONS['altText'];
  return {
    field: 'altText',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'altText' : 'altText')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_5(input = {}) {
  const value = normalizeField('position', input['position']);
  const definition = PARAMETER_DEFINITIONS['position'];
  return {
    field: 'position',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'position' : 'position')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_6(input = {}) {
  const value = normalizeField('width', input['width']);
  const definition = PARAMETER_DEFINITIONS['width'];
  return {
    field: 'width',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'width' : 'width')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_7(input = {}) {
  const value = normalizeField('height', input['height']);
  const definition = PARAMETER_DEFINITIONS['height'];
  return {
    field: 'height',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'height' : 'height')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_8(input = {}) {
  const value = normalizeField('mimeType', input['mimeType']);
  const definition = PARAMETER_DEFINITIONS['mimeType'];
  return {
    field: 'mimeType',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'mimeType' : 'mimeType')]: value }, { partial: true }).valid
  };
}

function parameterPolicy_9(input = {}) {
  const value = normalizeField('isPrimary', input['isPrimary']);
  const definition = PARAMETER_DEFINITIONS['isPrimary'];
  return {
    field: 'isPrimary',
    value,
    type: definition.type,
    required: definition.required,
    nullable: definition.nullable,
    valid: validatePayload({ [String(definition.required ? 'isPrimary' : 'isPrimary')]: value }, { partial: true }).valid
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

for (const [index, field] of FIELD_NAMES.entries()) {
  module.exports[`parameterPolicy_${index}`] = input => {
    const definition = PARAMETER_DEFINITIONS[field];
    const value = normalizeField(field, input ? input[field] : undefined);
    return { field, value, type: definition.type, required: definition.required, nullable: definition.nullable };
  };
}
