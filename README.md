# Dy-Alchemy

[![Build Status](https://circleci.com/gh/blackflux/dy-alchemy.png?style=shield)](https://circleci.com/gh/blackflux/dy-alchemy)
[![Test Coverage](https://img.shields.io/coveralls/blackflux/dy-alchemy/master.svg)](https://coveralls.io/github/blackflux/dy-alchemy?branch=master)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=blackflux/dy-alchemy)](https://dependabot.com)
[![Dependencies](https://david-dm.org/blackflux/dy-alchemy/status.svg)](https://david-dm.org/blackflux/dy-alchemy)
[![NPM](https://img.shields.io/npm/v/dy-alchemy.svg)](https://www.npmjs.com/package/dy-alchemy)
[![Downloads](https://img.shields.io/npm/dt/dy-alchemy.svg)](https://www.npmjs.com/package/dy-alchemy)
[![Semantic-Release](https://github.com/blackflux/js-gardener/blob/master/assets/icons/semver.svg)](https://github.com/semantic-release/semantic-release)
[![Gardener](https://github.com/blackflux/js-gardener/blob/master/assets/badge.svg)](https://github.com/blackflux/js-gardener)

Simplification of Amazon DynamoDB interactions

## Getting Started

```bash
npm i --save dy-alchemy
```

## Model

This library comes with a basic object relational mapper (ORM) for interacting with Dynamodb objects in a consistent manner.

### Initialization

<!-- eslint-disable import/no-unresolved -->
```js
const { Model } = require('dy-alchemy');

const model = new Model({
  modelName: 'model-name',
  tableName: 'dynamo-table-name',
  awsConfig: {},
  errorMap: {
    ItemNotFound: ({ id }) => { /* ... */ },
    ItemExists: ({ id }) => { /* ... */ }
  },
  callback: (/* {
    id, modelName, tableName, actionType
  } */) => { /* ... */ },
  primaryKeys: []
});
model.get(/* ... */);
```

_Params_

* `modelName` _string_: Name of model being accessed
* `tableName` _string_: Name of Dynamo Table associated with model
* `schema` _{ [string]: object }_: Defined below
* `awsConfig` _object_: Optional hard coded config passed to aws-sdk
* `errorMap` _object_: Optional Key / Value map to allow custom errors
* `callback` _function_: Optional hook after successful actions, `actionType` may be one of ['get', 'create', 'update', 'delete']
* `primaryKeys` _array\<string\>_: Optional list of keys to automatically generate an id. If provided, keys are required on object created.

### Schema

[DataMapper](https://github.com/awslabs/dynamodb-data-mapper-js/tree/master/packages/dynamodb-data-mapper) style schema
with support for `defaultValue`.

Example:
<!-- eslint-disable no-unused-vars -->
```js
const schema = {
  id: {
    type: 'String',
    keyType: 'HASH'
  },
  isWatched: {
    type: 'Boolean',
    defaultValue: false
  }
};
```

*_Important: fields with `defaultValue` are assigned in application layer logic, and therefore
should only be used in DynamoDB conditionals with caution._*

### Model Methods

All returning methods return unmarshalled dynamo data on success

* Get
* Create
* Update
* Delete

#### Get

Fetches model from Dynamo using [Dynamodb::GetItem](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#getItem-property)

<!-- eslint-disable no-undef -->
```js
modelName.get({ id, fields });
```

_Params_

* `id` string: Id of model to get
* `fields` array: Array of fields to request

#### Create

Creates object using [Dynamodb::PutItem](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property) if not already exists

<!-- eslint-disable no-undef -->
```js
modelName.create({
  id, data, fields, conditions
});
```

_Params_

* `id` string: Id of model to create, must be unique. _Must provide id or configure primaryKeys but not both_.
* `data` object: Data to populate dynamo tuple. _Important_: `id` is injected into `data`
* `fields` array: Array of fields to request
* `conditions` array: Optional list of [Amazon DynamoDB Expressions](https://github.com/awslabs/dynamodb-data-mapper-js/tree/master/packages/dynamodb-expressions)

#### Update

Do a partial update on object using [Dynamodb::UpdateItem](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateItem-property) if object already exists

<!-- eslint-disable no-undef -->
```js
modelName.update({
  id, data, fields, conditions
});
```

_Params_

* `id` string: Id of model to update
* `data` object: Data to update
* `fields` array: Array of fields to request
* `conditions` array: Optional list of [Amazon DynamoDB Expressions](https://github.com/awslabs/dynamodb-data-mapper-js/tree/master/packages/dynamodb-expressions)

#### Upsert

Upserts object using [Dynamodb::PutItem](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property)

<!-- eslint-disable no-undef -->
```js
modelName.upsert({
  id, data, fields, conditions
});
```

_Params_

* `id` string: Id of model to upsert. _Must provide id or configure primaryKeys but not both_.
* `data` object: Data to populate dynamo tuple. _Important_: `id` is injected into `data`
* `fields` array: Array of fields to request
* `conditions` array: Optional list of [Amazon DynamoDB Expressions](https://github.com/awslabs/dynamodb-data-mapper-js/tree/master/packages/dynamodb-expressions)

#### Delete

Delete an object using [Dynamodb::DeleteItem](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#deleteItem-property)

<!-- eslint-disable no-undef -->
```js
modelName.delete({ id, conditions });
```

_Params_

* `id` string: Id of model to delete
* `conditions` array: Optional list of [Amazon DynamoDB Expressions](https://github.com/awslabs/dynamodb-data-mapper-js/tree/master/packages/dynamodb-expressions)

#### List

Query for a list of objects using [Dynamodb::Query](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#query-property)

<!-- eslint-disable no-undef -->
```js
modelName.list({ indexName, indexMap, fields });
```

_Params_

* `indexName` string: Name of index to query against
* `indexMap` { [string]: any }: Key / Value map of index attributes to match against
* `fields` array: Array of fields to request

## Lock Manager

Wrapper around [dynamodb-lock-client](https://www.npmjs.com/package/dynamodb-lock-client) with lazy initialization.

### DynamoDb Table

Cloudformation information

```yml
DynamoLockTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: [[LOCK TABLE NAME HERE]]
    AttributeDefinitions:
      - AttributeName: id
        AttributeType: S
    KeySchema:
      - AttributeName: id
        KeyType: HASH
    ProvisionedThroughput:
      ReadCapacityUnits: 1
      WriteCapacityUnits: 1
```
