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
