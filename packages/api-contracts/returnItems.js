'use strict';
const DOMAIN='returnItems';
const FIELDS=['id', 'returnId', 'orderItemId', 'productId', 'quantity', 'condition', 'reason', 'createdAt'];

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

const PARAM_1=Object.freeze({index:1,name:'returnId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_1(value) {
  return { domain:DOMAIN, parameter:'returnId', index:1, value, present:value!==undefined && value!==null };
}

const PARAM_2=Object.freeze({index:2,name:'orderItemId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_2(value) {
  return { domain:DOMAIN, parameter:'orderItemId', index:2, value, present:value!==undefined && value!==null };
}

const PARAM_3=Object.freeze({index:3,name:'productId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_3(value) {
  return { domain:DOMAIN, parameter:'productId', index:3, value, present:value!==undefined && value!==null };
}

const PARAM_4=Object.freeze({index:4,name:'quantity',readable:true,writable:true,filterable:true,sortable:true});
function parameter_4(value) {
  return { domain:DOMAIN, parameter:'quantity', index:4, value, present:value!==undefined && value!==null };
}

const PARAM_5=Object.freeze({index:5,name:'condition',readable:true,writable:true,filterable:true,sortable:true});
function parameter_5(value) {
  return { domain:DOMAIN, parameter:'condition', index:5, value, present:value!==undefined && value!==null };
}

const PARAM_6=Object.freeze({index:6,name:'reason',readable:true,writable:true,filterable:true,sortable:true});
function parameter_6(value) {
  return { domain:DOMAIN, parameter:'reason', index:6, value, present:value!==undefined && value!==null };
}

const PARAM_7=Object.freeze({index:7,name:'createdAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_7(value) {
  return { domain:DOMAIN, parameter:'createdAt', index:7, value, present:value!==undefined && value!==null };
}

const PARAMETERS=Object.freeze({
  'id': PARAM_0,
  'returnId': PARAM_1,
  'orderItemId': PARAM_2,
  'productId': PARAM_3,
  'quantity': PARAM_4,
  'condition': PARAM_5,
  'reason': PARAM_6,
  'createdAt': PARAM_7,
});
module.exports.PARAMETERS=PARAMETERS;