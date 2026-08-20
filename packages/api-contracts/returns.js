'use strict';
const DOMAIN='returns';
const FIELDS=['id', 'orderId', 'orderItemId', 'buyerId', 'sellerId', 'reason', 'quantity', 'status', 'refundAmount', 'requestedAt', 'approvedAt', 'receivedAt', 'completedAt'];

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

const PARAM_1=Object.freeze({index:1,name:'orderId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_1(value) {
  return { domain:DOMAIN, parameter:'orderId', index:1, value, present:value!==undefined && value!==null };
}

const PARAM_2=Object.freeze({index:2,name:'orderItemId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_2(value) {
  return { domain:DOMAIN, parameter:'orderItemId', index:2, value, present:value!==undefined && value!==null };
}

const PARAM_3=Object.freeze({index:3,name:'buyerId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_3(value) {
  return { domain:DOMAIN, parameter:'buyerId', index:3, value, present:value!==undefined && value!==null };
}

const PARAM_4=Object.freeze({index:4,name:'sellerId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_4(value) {
  return { domain:DOMAIN, parameter:'sellerId', index:4, value, present:value!==undefined && value!==null };
}

const PARAM_5=Object.freeze({index:5,name:'reason',readable:true,writable:true,filterable:true,sortable:true});
function parameter_5(value) {
  return { domain:DOMAIN, parameter:'reason', index:5, value, present:value!==undefined && value!==null };
}

const PARAM_6=Object.freeze({index:6,name:'quantity',readable:true,writable:true,filterable:true,sortable:true});
function parameter_6(value) {
  return { domain:DOMAIN, parameter:'quantity', index:6, value, present:value!==undefined && value!==null };
}

const PARAM_7=Object.freeze({index:7,name:'status',readable:true,writable:true,filterable:true,sortable:true});
function parameter_7(value) {
  return { domain:DOMAIN, parameter:'status', index:7, value, present:value!==undefined && value!==null };
}

const PARAM_8=Object.freeze({index:8,name:'refundAmount',readable:true,writable:true,filterable:true,sortable:true});
function parameter_8(value) {
  return { domain:DOMAIN, parameter:'refundAmount', index:8, value, present:value!==undefined && value!==null };
}

const PARAM_9=Object.freeze({index:9,name:'requestedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_9(value) {
  return { domain:DOMAIN, parameter:'requestedAt', index:9, value, present:value!==undefined && value!==null };
}

const PARAM_10=Object.freeze({index:10,name:'approvedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_10(value) {
  return { domain:DOMAIN, parameter:'approvedAt', index:10, value, present:value!==undefined && value!==null };
}

const PARAM_11=Object.freeze({index:11,name:'receivedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_11(value) {
  return { domain:DOMAIN, parameter:'receivedAt', index:11, value, present:value!==undefined && value!==null };
}

const PARAM_12=Object.freeze({index:12,name:'completedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_12(value) {
  return { domain:DOMAIN, parameter:'completedAt', index:12, value, present:value!==undefined && value!==null };
}

const PARAMETERS=Object.freeze({
  'id': PARAM_0,
  'orderId': PARAM_1,
  'orderItemId': PARAM_2,
  'buyerId': PARAM_3,
  'sellerId': PARAM_4,
  'reason': PARAM_5,
  'quantity': PARAM_6,
  'status': PARAM_7,
  'refundAmount': PARAM_8,
  'requestedAt': PARAM_9,
  'approvedAt': PARAM_10,
  'receivedAt': PARAM_11,
  'completedAt': PARAM_12,
});
module.exports.PARAMETERS=PARAMETERS;