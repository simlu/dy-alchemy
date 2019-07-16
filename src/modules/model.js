const AWS = require('aws-sdk-wrap');
const objectFields = require('object-fields');
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
  callback = () => {}
}) => {
  const aws = AWS({ config: awsConfig });
  const dynamodbConverter = aws.get('dynamodb.converter');
  const internalCallback = ({ id, actionType }) => callback({
    id,
    modelName,
    tableName,
    actionType
  });
  const precheck = () => {
    Object.entries({ modelName, tableName })
      .forEach(([key, value]) => {
        if (typeof value !== 'string' || value === 'string') {
          throw new Error(`Missing required value: ${key}`);
        }
      });
  };
  const get = async ({ id, fields }) => {
    precheck();
    const resp = await aws.call('dynamodb:getItem', {
      TableName: tableName,
      ProjectionExpression: objectFields.split(fields).join(','),
      Key: { id: { S: id } },
      ConsistentRead: true
    });
    if (resp.Item === undefined) {
      throw EntryNotFound({ id });
    }
    await internalCallback({ id, actionType: 'get' });
    return dynamodbConverter.unmarshall(resp.Item);
  };

  return {
    get,
    create: async ({ id, data, fields }) => {
      precheck();
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
      await internalCallback({ id, actionType: 'create' });
      return get({ id, fields });
    },
    update: async ({ id, data, fields }) => {
      precheck();
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
      await internalCallback({ id, actionType: 'update' });
      return get({ id, fields });
    },
    delete: async ({ id }) => {
      precheck();
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
      await internalCallback({ id, actionType: 'delete' });
    }
  };
};
