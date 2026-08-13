'use strict';
const domains = require('../../../../packages/domain-modules');
module.exports = Object.freeze(Object.fromEntries(Object.entries(domains).map(([name, mod]) => [name, {name, version:mod.VERSION, fields:mod.FIELD_NAMES, parameters:mod.PARAMETERS}])));
