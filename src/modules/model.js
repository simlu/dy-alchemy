const assert = require('assert');
const get = require('lodash.get');
const AWS = require('aws-sdk-wrap');
const objectHash = require('object-hash');
const { DataMapper, DynamoDbSchema, DynamoDbTable } = require('@aws/dynamodb-data-mapper');
const {
  DefaultItemNotFoundError, DefaultItemExistsError,
  CannotUpdatePrimaryKeys, CannotProvideBothIdAndPrimaryKeys,
  IncompletePrimaryKey
} = require('./errors');
const { fromCursor, buildPageObject } = require('../util/paging');

const DefaultItemNotFound = ({ id }) => new DefaultItemNotFoundError(id);
const DefaultItemExists = ({ id }) => new DefaultItemExistsError(id);

class Model {
  constructor({
    modelName,
    tableName,
    schema,
    awsConfig,
    errorMap: {
      ItemNotFound = DefaultItemNotFound,
      ItemExists = DefaultItemExists
    } = {},
    callback = () => {},
    primaryKeys = null
  }) {
    assert(get(schema, 'id.keyType') === 'HASH', '"id" must have "Hash" keyType.');
    assert(Object.entries(schema)
      .filter(([k, _]) => k !== 'id')
      .every(([_, v]) => v.keyType === undefined), '"keyType" only allowed on "id".');
    assert(primaryKeys === null || Array.isArray(primaryKeys));
    class MapperClass {
      constructor(kwargs) {
        Object.assign(this, kwargs);
      }
    }
    Object.defineProperties(MapperClass.prototype, {
      [DynamoDbTable]: { value: tableName },
      [DynamoDbSchema]: { value: schema }
    });
    const aws = AWS({ config: awsConfig });
    this.mapper = new DataMapper({ client: aws.get('dynamodb') });
    this.modelName = modelName;
    this.tableName = tableName;
    this.MapperClass = MapperClass;
    this.ItemNotFound = ItemNotFound;
    this.ItemExists = ItemExists;
    this.callback = callback;
    this.primaryKeys = primaryKeys;
  }

  // eslint-disable-next-line no-underscore-dangle
  _before() {
    Object.entries({
      modelName: this.modelName,
      tableName: this.tableName
    })
      .forEach(([key, value]) => {
        if (typeof value !== 'string' || value === '') {
          throw new Error(`Missing required value: ${key}`);
        }
      });
  }

  // eslint-disable-next-line no-underscore-dangle
  _callback(actionType, id) {
    return this.callback({
      id,
      actionType,
      modelName: this.modelName,
      tableName: this.tableName
    });
  }

  async get({ id, fields }) {
    // eslint-disable-next-line no-underscore-dangle
    this._before();
    let resp;
    try {
      resp = await this.mapper.get(new this.MapperClass({ id }), {
        projection: fields,
        readConsistency: 'strong'
      });
    } catch (err) {
      if (err.name === 'ItemNotFoundException') {
        throw this.ItemNotFound({ id });
      }
      throw err;
    }
    // eslint-disable-next-line no-underscore-dangle
    await this._callback('get', id);
    return resp;
  }

  async create({
    id: providedId = null,
    data,
    fields
  }) {
    if ((providedId === null) === (this.primaryKeys === null)) {
      throw new CannotProvideBothIdAndPrimaryKeys();
    }
    if (this.primaryKeys !== null && this.primaryKeys.some(k => data[k] === undefined)) {
      throw new IncompletePrimaryKey();
    }
    const id = providedId !== null
      ? providedId
      : objectHash(this.primaryKeys
        .sort()
        .reduce((prev, cur) => Object.assign(prev, { [cur]: data[cur] }), {}));
    // eslint-disable-next-line no-underscore-dangle
    this._before();
    try {
      await this.mapper.put(new this.MapperClass({ ...data, id }), {
        condition: {
          subject: 'id',
          type: 'NotEquals',
          object: id
        }
      });
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw this.ItemExists({ id });
      }
      throw err;
    }
    // eslint-disable-next-line no-underscore-dangle
    await this._callback('create', id);
    return this.get({ id, fields });
  }

  async update({
    id, data, fields, conditions = []
  }) {
    // eslint-disable-next-line no-underscore-dangle
    this._before();
    if (this.primaryKeys !== null && this.primaryKeys.some(k => data[k] !== undefined)) {
      throw new CannotUpdatePrimaryKeys();
    }
    try {
      await this.mapper.update(new this.MapperClass({ ...data, id }), {
        condition: {
          type: 'And',
          conditions: [
            { subject: 'id', type: 'Equals', object: id },
            ...conditions
          ]
        },
        onMissing: 'skip'
      });
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw this.ItemNotFound({ id });
      }
      throw err;
    }
    // eslint-disable-next-line no-underscore-dangle
    await this._callback('update', id);
    return this.get({ id, fields });
  }

  async delete({ id, conditions = [] }) {
    // eslint-disable-next-line no-underscore-dangle
    this._before();
    try {
      await this.mapper.delete(new this.MapperClass({ id }), {
        condition: {
          type: 'And',
          conditions: [
            { subject: 'id', type: 'Equals', object: id },
            ...conditions
          ]
        },
        returnValues: 'NONE'
      });
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw this.ItemNotFound({ id });
      }
      throw err;
    }
    // eslint-disable-next-line no-underscore-dangle
    await this._callback('delete', id);
  }

  async list({
    indexName,
    indexMap,
    fields,
    ascending = true,
    limit = 20,
    cursor = null
  }) {
    // eslint-disable-next-line no-underscore-dangle
    this._before();
    const fieldsContainsId = fields.includes('id');
    const toQuery = fieldsContainsId ? fields : [...fields, 'id'];

    const {
      lastEvaluatedKey = null,
      scanIndexForward = ascending,
      limit: queryLimit = limit,
      currentPage = null
    } = fromCursor(cursor);
    const iterator = this.mapper.query(this.MapperClass, indexMap, Object.assign({
      indexName,
      projection: toQuery,
      scanIndexForward,
      limit: queryLimit
    }, lastEvaluatedKey === null ? {} : { startKey: lastEvaluatedKey }));
    const payload = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const r of iterator) {
      payload.push(r);
      // eslint-disable-next-line no-underscore-dangle
      await this._callback('list', r.id);
    }

    const page = buildPageObject(
      currentPage === null ? 1 : currentPage,
      queryLimit,
      get(iterator, 'paginator.lastKey', null)
    );

    if (!fieldsContainsId) {
      payload.forEach((p) => {
        // eslint-disable-next-line no-param-reassign
        delete p.id;
      });
    }
    return { payload, page };
  }
}

module.exports = Model;
