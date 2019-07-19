const AWS = require('aws-sdk-wrap');
const objectFields = require('object-fields');
const { DataMapper, DynamoDbSchema, DynamoDbTable } = require('@aws/dynamodb-data-mapper');
const { DefaultItemNotFoundError, DefaultItemExistsError } = require('./errors');

const DefaultItemNotFound = ({ id }) => new DefaultItemNotFoundError(id);
const DefaultItemExists = ({ id }) => new DefaultItemExistsError(id);

module.exports = ({
  modelName,
  tableName,
  schema,
  awsConfig = {},
  errorMap: {
    ItemNotFound = DefaultItemNotFound,
    ItemExists = DefaultItemExists
  } = {},
  callback = () => {}
}) => {
  class Model {}
  Object.defineProperties(Model.prototype, {
    [DynamoDbTable]: { value: tableName },
    [DynamoDbSchema]: { value: schema }
  });
  const aws = AWS({ config: awsConfig });
  const mapper = new DataMapper({ client: aws.get('dynamodb') });
  const internalCallback = ({ id, actionType }) => callback({
    id,
    modelName,
    tableName,
    actionType
  });
  const precheck = () => {
    Object.entries({ modelName, tableName })
      .forEach(([key, value]) => {
        if (typeof value !== 'string' || value === '') {
          throw new Error(`Missing required value: ${key}`);
        }
      });
  };
  const get = async ({ id, fields }) => {
    precheck();
    let resp;
    try {
      resp = await mapper.get(Object.assign(new Model(), { id }), {
        projection: objectFields.split(fields),
        readConsistency: 'strong'
      });
    } catch (err) {
      if (err.name === 'ItemNotFoundException') {
        throw ItemNotFound({ id });
      }
      throw err;
    }
    await internalCallback({ id, actionType: 'get' });
    return resp;
  };

  return {
    get,
    create: async ({ id, data, fields }) => {
      precheck();
      try {
        await mapper.put(Object.assign(new Model(), data, { id }), {
          condition: {
            subject: 'id',
            type: 'NotEquals',
            object: id
          }
        });
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          throw ItemExists({ id });
        }
        throw err;
      }
      await internalCallback({ id, actionType: 'create' });
      return get({ id, fields });
    },
    update: async ({ id, data, fields }) => {
      precheck();
      try {
        await mapper.update(Object.assign(new Model(), data, { id }), {
          condition: {
            subject: 'id',
            type: 'Equals',
            object: id
          },
          onMissing: 'skip'
        });
      } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          throw ItemNotFound({ id });
        }
        throw err;
      }
      await internalCallback({ id, actionType: 'update' });
      return get({ id, fields });
    },
    delete: async ({ id }) => {
      precheck();
      try {
        await mapper.delete(Object.assign(new Model(), { id }), {
          condition: {
            subject: 'id',
            type: 'Equals',
            object: id
          },
          returnValues: 'NONE'
        });
      } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          throw ItemNotFound({ id });
        }
        throw err;
      }
      await internalCallback({ id, actionType: 'delete' });
    },
    list: async ({ indexName, indexMap, fields }) => {
      precheck();
      const iterator = mapper.query(Model, indexMap, {
        indexName,
        projection: objectFields.split(fields)
      });
      const resp = [];
      // eslint-disable-next-line no-restricted-syntax
      for await (const r of iterator) {
        resp.push(r);
      }
      return resp;
    }
  };
};
