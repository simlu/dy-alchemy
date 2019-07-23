const objectFields = require('object-fields');

module.exports.format = fields => (Array.isArray(fields) ? fields : objectFields.split(fields));
