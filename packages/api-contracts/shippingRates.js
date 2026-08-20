'use strict';
const DOMAIN='shippingRates';
const FIELDS=['id', 'zoneId', 'carrier', 'service', 'minWeight', 'maxWeight', 'minOrder', 'maxOrder', 'rate', 'freeThreshold', 'active', 'createdAt', 'updatedAt'];

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

const PARAM_1=Object.freeze({index:1,name:'zoneId',readable:true,writable:true,filterable:true,sortable:true});
function parameter_1(value) {
  return { domain:DOMAIN, parameter:'zoneId', index:1, value, present:value!==undefined && value!==null };
}

const PARAM_2=Object.freeze({index:2,name:'carrier',readable:true,writable:true,filterable:true,sortable:true});
function parameter_2(value) {
  return { domain:DOMAIN, parameter:'carrier', index:2, value, present:value!==undefined && value!==null };
}

const PARAM_3=Object.freeze({index:3,name:'service',readable:true,writable:true,filterable:true,sortable:true});
function parameter_3(value) {
  return { domain:DOMAIN, parameter:'service', index:3, value, present:value!==undefined && value!==null };
}

const PARAM_4=Object.freeze({index:4,name:'minWeight',readable:true,writable:true,filterable:true,sortable:true});
function parameter_4(value) {
  return { domain:DOMAIN, parameter:'minWeight', index:4, value, present:value!==undefined && value!==null };
}

const PARAM_5=Object.freeze({index:5,name:'maxWeight',readable:true,writable:true,filterable:true,sortable:true});
function parameter_5(value) {
  return { domain:DOMAIN, parameter:'maxWeight', index:5, value, present:value!==undefined && value!==null };
}

const PARAM_6=Object.freeze({index:6,name:'minOrder',readable:true,writable:true,filterable:true,sortable:true});
function parameter_6(value) {
  return { domain:DOMAIN, parameter:'minOrder', index:6, value, present:value!==undefined && value!==null };
}

const PARAM_7=Object.freeze({index:7,name:'maxOrder',readable:true,writable:true,filterable:true,sortable:true});
function parameter_7(value) {
  return { domain:DOMAIN, parameter:'maxOrder', index:7, value, present:value!==undefined && value!==null };
}

const PARAM_8=Object.freeze({index:8,name:'rate',readable:true,writable:true,filterable:true,sortable:true});
function parameter_8(value) {
  return { domain:DOMAIN, parameter:'rate', index:8, value, present:value!==undefined && value!==null };
}

const PARAM_9=Object.freeze({index:9,name:'freeThreshold',readable:true,writable:true,filterable:true,sortable:true});
function parameter_9(value) {
  return { domain:DOMAIN, parameter:'freeThreshold', index:9, value, present:value!==undefined && value!==null };
}

const PARAM_10=Object.freeze({index:10,name:'active',readable:true,writable:true,filterable:true,sortable:true});
function parameter_10(value) {
  return { domain:DOMAIN, parameter:'active', index:10, value, present:value!==undefined && value!==null };
}

const PARAM_11=Object.freeze({index:11,name:'createdAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_11(value) {
  return { domain:DOMAIN, parameter:'createdAt', index:11, value, present:value!==undefined && value!==null };
}

const PARAM_12=Object.freeze({index:12,name:'updatedAt',readable:true,writable:true,filterable:true,sortable:true});
function parameter_12(value) {
  return { domain:DOMAIN, parameter:'updatedAt', index:12, value, present:value!==undefined && value!==null };
}

const PARAMETERS=Object.freeze({
  'id': PARAM_0,
  'zoneId': PARAM_1,
  'carrier': PARAM_2,
  'service': PARAM_3,
  'minWeight': PARAM_4,
  'maxWeight': PARAM_5,
  'minOrder': PARAM_6,
  'maxOrder': PARAM_7,
  'rate': PARAM_8,
  'freeThreshold': PARAM_9,
  'active': PARAM_10,
  'createdAt': PARAM_11,
  'updatedAt': PARAM_12,
});
module.exports.PARAMETERS=PARAMETERS;