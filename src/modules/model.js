const assert = require('assert');
const AWS = require('aws-sdk-wrap');
const objectPaths = require('obj-paths');
const { DefaultEntryNotFoundError, DefaultEntryExistsError } = require('./errors');

const DefaultEntryNotFound = ({ id }) => new DefaultEntryNotFoundError(id);
const DefaultEntryExists = ({ id }) => new DefaultEntryExistsError(id);

module.exports = ({
  modelName,
  tableName,
  awsConfig = {},
  errorMap: {
    EntryNotFound = DefaultEntryNotFound,
    EntryExists = DefaultEntryExists
  } = {},
  callback = () => {
  }
}) => {
  assert(typeof modelName === 'string');
  assert(typeof tableName === 'string');
  const aws = AWS({ config: awsConfig });
  const dynamodbConverter = aws.get('dynamodb.converter');
  const get = async ({ id, fields }) => {
    const resp = await aws.call('dynamodb:getItem', {
      TableName: tableName,
      ProjectionExpression: objectPaths.split(fields).join(','),
      Key: { id: { S: id } },
      ConsistentRead: true
    });
    if (resp.Item === undefined) {
      throw EntryNotFound({ id });
    }
    await callback({ tableName, actionType: 'get', id });
    return dynamodbConverter.unmarshall(resp.Item);
  };

  return {
    get,
    create: async ({ id, data, fields }) => {
      const resp = await aws.call('dynamodb:putItem', {
        ConditionExpression: 'id <> :id',
        ExpressionAttributeValues: { ':id': { S: id } },
        TableName: tableName,
        Item: dynamodbConverter.marshall(Object.assign({}, data, { id }))
      }, {
        expectedErrorCodes: ['ConditionalCheckFailedException']
      });
      if (resp === 'ConditionalCheckFailedException') {
        throw EntryExists({ id });
      }
      await callback({ tableName, actionType: 'create', id });
      return get({ id, fields });
    },
    update: async ({ id, data, fields }) => {
      const resp = await aws.call('dynamodb:updateItem', {
        Key: { id: { S: id } },
        ConditionExpression: 'id = :id',
        ExpressionAttributeNames: Object.assign({}, Object.keys(data)
          .reduce((p, k) => Object.assign(p, { [`#${k.toUpperCase()}`]: k }), {}), {}),
        ExpressionAttributeValues: Object.assign(
          {},
          Object.entries(data).reduce((p, [k, v]) => Object.assign(p, { [`:${k}`]: dynamodbConverter.input(v) }), {}),
          { ':id': { S: id } }
        ),
        UpdateExpression: `SET ${Object.keys(data).map(k => `#${k.toUpperCase()} = :${k}`).join(', ')}`,
        TableName: tableName
      }, {
        expectedErrorCodes: ['ConditionalCheckFailedException']
      });
      if (resp === 'ConditionalCheckFailedException') {
        throw EntryNotFound({ id });
      }
      await callback({ tableName, actionType: 'update', id });
      return get({ id, fields });
    },
    delete: async ({ id }) => {
      const resp = await aws.call('dynamodb:deleteItem', {
        ConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': { S: id } },
        TableName: tableName,
        Key: { id: { S: id } }
      }, {
        expectedErrorCodes: ['ConditionalCheckFailedException']
      });
      if (resp === 'ConditionalCheckFailedException') {
        throw EntryNotFound({ id });
      }
      await callback({ tableName, actionType: 'delete', id });
    }
  };
};
