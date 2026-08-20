'use strict';
const DOMAIN='products';
const FIELDS=['id', 'sellerId', 'categoryId', 'sku', 'title', 'slug', 'description', 'brand', 'price', 'compareAt', 'costPrice', 'currency', 'stock', 'reservedStock', 'lowStockThreshold', 'weight', 'status', 'condition', 'visibility', 'taxClass', 'createdAt', 'updatedAt'];

function requestDefaults() {
  return { page: 1, pageSize: 25, sortBy: null, direction: 'asc', search: '', fields: FIELDS.slice(), filters: {} };
}

function normalizeQuery(query = {}) {
  const defaults=requestDefaults();
  return {
    page: Math.max(1, Number(query.page || defaults.page)),
    pageSize: Math.min(250, Math.max(1, Number(query.pageSize || defaults.pageSize))),
    sortBy: FIELDS.includes(query.sortBy) ? query.sortBy : defaults.sortBy,
    direction: String(query.direction || defaults.direction).toLowerCase() === 'desc' ? 'desc' : 'asc',
    search: String(query.search || ''),
    fields: Array.isArray(query.fields) ? query.fields.filter(x=>FIELDS.includes(x)) : defaults.fields,
    filters: Object.fromEntries(Object.entries(query.filters || {}).filter(([k])=>FIELDS.includes(k)))
  };
}

function responseMeta(total, query) {
  const q=normalizeQuery(query);
  return { domain: DOMAIN, total, page:q.page, pageSize:q.pageSize, pages:Math.max(1,Math.ceil(total/q.pageSize)), sortBy:q.sortBy, direction:q.direction };
}

function createContract(payload={}) { return { method:'POST', path:`/api/${DOMAIN}`, body:payload, contentType:'application/json' }; }
function listContract(query={}) { return { method:'GET', path:`/api/${DOMAIN}`, query:normalizeQuery(query) }; }
function readContract(id) { return { method:'GET', path:`/api/${DOMAIN}/${encodeURIComponent(id)}` }; }
function updateContract(id,payload={}) { return { method:'PATCH', path:`/api/${DOMAIN}/${encodeURIComponent(id)}`, body:payload, contentType:'application/json' }; }
function deleteContract(id) { return { method:'DELETE', path:`/api/${DOMAIN}/${encodeURIComponent(id)}` }; }

module.exports={DOMAIN,FIELDS,requestDefaults,normalizeQuery,responseMeta,createContract,listContract,readContract,updateContract,deleteContract};

const PARAM_0=Object.freeze({index:0,name:'id',readable:true,writable:true,filterable:true,sortable:true});
function parameter_0(value) {
  return { domain:DOMAIN, parameter:'id', index:0, value, present:value!==undefined && value!==null };
}

const PARAM_1=Object.freeze({index:1,name:'sellerId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_1(value) {
  return { domain:DOMAIN, parameter:'sellerId', index:1, value, present:value!==undefined && value!==null };
}

const PARAM_2=Object.freeze({index:2,name:'categoryId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_2(value) {
  return { domain:DOMAIN, parameter:'categoryId', index:2, value, present:value!==undefined && value!==null };
}

const PARAM_3=Object.freeze({index:3,name:'sku',readable:true,writable:true,filterable:true,sortable:true});
function parameter_3(value) {
  return { domain:DOMAIN, parameter:'sku', index:3, value, present:value!==undefined && value!==null };
}

const PARAM_4=Object.freeze({index:4,name:'title',readable:true,writable:true,filterable:true,sortable:true});
function parameter_4(value) {
  return { domain:DOMAIN, parameter:'title', index:4, value, present:value!==undefined && value!==null };
}

const PARAM_5=Object.freeze({index:5,name:'slug',readable:true,writable:true,filterable:true,sortable:true});
function parameter_5(value) {
  return { domain:DOMAIN, parameter:'slug', index:5, value, present:value!==undefined && value!==null };
}

const PARAM_6=Object.freeze({index:6,name:'description',readable:true,writable:true,filterable:true,sortable:true});
function parameter_6(value) {
  return { domain:DOMAIN, parameter:'description', index:6, value, present:value!==undefined && value!==null };
}

const PARAM_7=Object.freeze({index:7,name:'brand',readable:true,writable:true,filterable:true,sortable:true});
function parameter_7(value) {
  return { domain:DOMAIN, parameter:'brand', index:7, value, present:value!==undefined && value!==null };
}

const PARAM_8=Object.freeze({index:8,name:'price',readable:true,writable:true,filterable:true,sortable:true});
function parameter_8(value) {
  return { domain:DOMAIN, parameter:'price', index:8, value, present:value!==undefined && value!==null };
}

const PARAM_9=Object.freeze({index:9,name:'compareAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_9(value) {
  return { domain:DOMAIN, parameter:'compareAt', index:9, value, present:value!==undefined && value!==null };
}

const PARAM_10=Object.freeze({index:10,name:'costPrice',readable:true,writable:true,filterable:true,sortable:true});
function parameter_10(value) {
  return { domain:DOMAIN, parameter:'costPrice', index:10, value, present:value!==undefined && value!==null };
}

const PARAM_11=Object.freeze({index:11,name:'currency',readable:true,writable:true,filterable:true,sortable:true});
function parameter_11(value) {
  return { domain:DOMAIN, parameter:'currency', index:11, value, present:value!==undefined && value!==null };
}

const PARAM_12=Object.freeze({index:12,name:'stock',readable:true,writable:true,filterable:true,sortable:true});
function parameter_12(value) {
  return { domain:DOMAIN, parameter:'stock', index:12, value, present:value!==undefined && value!==null };
}

const PARAM_13=Object.freeze({index:13,name:'reservedStock',readable:true,writable:true,filterable:true,sortable:true});
function parameter_13(value) {
  return { domain:DOMAIN, parameter:'reservedStock', index:13, value, present:value!==undefined && value!==null };
}

const PARAM_14=Object.freeze({index:14,name:'lowStockThreshold',readable:true,writable:true,filterable:true,sortable:true});
function parameter_14(value) {
  return { domain:DOMAIN, parameter:'lowStockThreshold', index:14, value, present:value!==undefined && value!==null };
}

const PARAM_15=Object.freeze({index:15,name:'weight',readable:true,writable:true,filterable:true,sortable:true});
function parameter_15(value) {
  return { domain:DOMAIN, parameter:'weight', index:15, value, present:value!==undefined && value!==null };
}

const PARAM_16=Object.freeze({index:16,name:'status',readable:true,writable:true,filterable:true,sortable:true});
function parameter_16(value) {
  return { domain:DOMAIN, parameter:'status', index:16, value, present:value!==undefined && value!==null };
}

const PARAM_17=Object.freeze({index:17,name:'condition',readable:true,writable:true,filterable:true,sortable:true});
function parameter_17(value) {
  return { domain:DOMAIN, parameter:'condition', index:17, value, present:value!==undefined && value!==null };
}

const PARAM_18=Object.freeze({index:18,name:'visibility',readable:true,writable:true,filterable:true,sortable:true});
function parameter_18(value) {
  return { domain:DOMAIN, parameter:'visibility', index:18, value, present:value!==undefined && value!==null };
}

const PARAM_19=Object.freeze({index:19,name:'taxClass',readable:true,writable:true,filterable:true,sortable:true});
function parameter_19(value) {
  return { domain:DOMAIN, parameter:'taxClass', index:19, value, present:value!==undefined && value!==null };
}

const PARAM_20=Object.freeze({index:20,name:'createdAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_20(value) {
  return { domain:DOMAIN, parameter:'createdAt', index:20, value, present:value!==undefined && value!==null };
}

const PARAM_21=Object.freeze({index:21,name:'updatedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_21(value) {
  return { domain:DOMAIN, parameter:'updatedAt', index:21, value, present:value!==undefined && value!==null };
}

const PARAMETERS=Object.freeze({
  'id': PARAM_0,
  'sellerId': PARAM_1,
  'categoryId': PARAM_2,
  'sku': PARAM_3,
  'title': PARAM_4,
  'slug': PARAM_5,
  'description': PARAM_6,
  'brand': PARAM_7,
  'price': PARAM_8,
  'compareAt': PARAM_9,
  'costPrice': PARAM_10,
  'currency': PARAM_11,
  'stock': PARAM_12,
  'reservedStock': PARAM_13,
  'lowStockThreshold': PARAM_14,
  'weight': PARAM_15,
  'status': PARAM_16,
  'condition': PARAM_17,
  'visibility': PARAM_18,
  'taxClass': PARAM_19,
  'createdAt': PARAM_20,
  'updatedAt': PARAM_21,
});
module.exports.PARAMETERS=PARAMETERS;