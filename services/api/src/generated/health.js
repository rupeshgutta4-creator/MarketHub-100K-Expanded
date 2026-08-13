'use strict';
const registry=require('./domainRegistry');
function domainHealth(){return Object.entries(registry).map(([name,v])=>({name,fields:v.fields.length,parameterCount:Object.keys(v.parameters).length,ready:true}));}
module.exports={domainHealth};
