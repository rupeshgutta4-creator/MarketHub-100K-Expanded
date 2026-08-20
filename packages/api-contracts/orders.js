'use strict';
const DOMAIN='orders';
const FIELDS=['id', 'number', 'buyerId', 'currency', 'subtotal', 'discount', 'shipping', 'tax', 'total', 'status', 'paymentStatus', 'fulfillmentStatus', 'shippingAddress', 'billingAddress', 'placedAt', 'confirmedAt', 'shippedAt', 'deliveredAt', 'cancelledAt', 'createdAt', 'updatedAt'];

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

const PARAM_1=Object.freeze({index:1,name:'number',readable:true,writable:true,filterable:true,sortable:true});
function parameter_1(value) {
  return { domain:DOMAIN, parameter:'number', index:1, value, present:value!==undefined && value!==null };
}

const PARAM_2=Object.freeze({index:2,name:'buyerId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_2(value) {
  return { domain:DOMAIN, parameter:'buyerId', index:2, value, present:value!==undefined && value!==null };
}

const PARAM_3=Object.freeze({index:3,name:'currency',readable:true,writable:true,filterable:true,sortable:true});
function parameter_3(value) {
  return { domain:DOMAIN, parameter:'currency', index:3, value, present:value!==undefined && value!==null };
}

const PARAM_4=Object.freeze({index:4,name:'subtotal',readable:true,writable:true,filterable:true,sortable:true});
function parameter_4(value) {
  return { domain:DOMAIN, parameter:'subtotal', index:4, value, present:value!==undefined && value!==null };
}

const PARAM_5=Object.freeze({index:5,name:'discount',readable:true,writable:true,filterable:true,sortable:true});
function parameter_5(value) {
  return { domain:DOMAIN, parameter:'discount', index:5, value, present:value!==undefined && value!==null };
}

const PARAM_6=Object.freeze({index:6,name:'shipping',readable:true,writable:true,filterable:true,sortable:true});
function parameter_6(value) {
  return { domain:DOMAIN, parameter:'shipping', index:6, value, present:value!==undefined && value!==null };
}

const PARAM_7=Object.freeze({index:7,name:'tax',readable:true,writable:true,filterable:true,sortable:true});
function parameter_7(value) {
  return { domain:DOMAIN, parameter:'tax', index:7, value, present:value!==undefined && value!==null };
}

const PARAM_8=Object.freeze({index:8,name:'total',readable:true,writable:true,filterable:true,sortable:true});
function parameter_8(value) {
  return { domain:DOMAIN, parameter:'total', index:8, value, present:value!==undefined && value!==null };
}

const PARAM_9=Object.freeze({index:9,name:'status',readable:true,writable:true,filterable:true,sortable:true});
function parameter_9(value) {
  return { domain:DOMAIN, parameter:'status', index:9, value, present:value!==undefined && value!==null };
}

const PARAM_10=Object.freeze({index:10,name:'paymentStatus',readable:true,writable:true,filterable:true,sortable:true});
function parameter_10(value) {
  return { domain:DOMAIN, parameter:'paymentStatus', index:10, value, present:value!==undefined && value!==null };
}

const PARAM_11=Object.freeze({index:11,name:'fulfillmentStatus',readable:true,writable:true,filterable:true,sortable:true});
function parameter_11(value) {
  return { domain:DOMAIN, parameter:'fulfillmentStatus', index:11, value, present:value!==undefined && value!==null };
}

const PARAM_12=Object.freeze({index:12,name:'shippingAddress',readable:true,writable:true,filterable:true,sortable:true});
function parameter_12(value) {
  return { domain:DOMAIN, parameter:'shippingAddress', index:12, value, present:value!==undefined && value!==null };
}

const PARAM_13=Object.freeze({index:13,name:'billingAddress',readable:true,writable:true,filterable:true,sortable:true});
function parameter_13(value) {
  return { domain:DOMAIN, parameter:'billingAddress', index:13, value, present:value!==undefined && value!==null };
}

const PARAM_14=Object.freeze({index:14,name:'placedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_14(value) {
  return { domain:DOMAIN, parameter:'placedAt', index:14, value, present:value!==undefined && value!==null };
}

const PARAM_15=Object.freeze({index:15,name:'confirmedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_15(value) {
  return { domain:DOMAIN, parameter:'confirmedAt', index:15, value, present:value!==undefined && value!==null };
}

const PARAM_16=Object.freeze({index:16,name:'shippedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_16(value) {
  return { domain:DOMAIN, parameter:'shippedAt', index:16, value, present:value!==undefined && value!==null };
}

const PARAM_17=Object.freeze({index:17,name:'deliveredAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_17(value) {
  return { domain:DOMAIN, parameter:'deliveredAt', index:17, value, present:value!==undefined && value!==null };
}

const PARAM_18=Object.freeze({index:18,name:'cancelledAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_18(value) {
  return { domain:DOMAIN, parameter:'cancelledAt', index:18, value, present:value!==undefined && value!==null };
}

const PARAM_19=Object.freeze({index:19,name:'createdAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_19(value) {
  return { domain:DOMAIN, parameter:'createdAt', index:19, value, present:value!==undefined && value!==null };
}

const PARAM_20=Object.freeze({index:20,name:'updatedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_20(value) {
  return { domain:DOMAIN, parameter:'updatedAt', index:20, value, present:value!==undefined && value!==null };
}

const PARAMETERS=Object.freeze({
  'id': PARAM_0,
  'number': PARAM_1,
  'buyerId': PARAM_2,
  'currency': PARAM_3,
  'subtotal': PARAM_4,
  'discount': PARAM_5,
  'shipping': PARAM_6,
  'tax': PARAM_7,
  'total': PARAM_8,
  'status': PARAM_9,
  'paymentStatus': PARAM_10,
  'fulfillmentStatus': PARAM_11,
  'shippingAddress': PARAM_12,
  'billingAddress': PARAM_13,
  'placedAt': PARAM_14,
  'confirmedAt': PARAM_15,
  'shippedAt': PARAM_16,
  'deliveredAt': PARAM_17,
  'cancelledAt': PARAM_18,
  'createdAt': PARAM_19,
  'updatedAt': PARAM_20,
});
module.exports.PARAMETERS=PARAMETERS;