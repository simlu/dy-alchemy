const get = require("lodash.get");
const DynamoDBLockClient = require("dynamodb-lock-client");
const AWS = require('aws-sdk-wrap');

module.exports = (lockTable, {
  leaseDurationMs = 10000,
  heartbeatPeriodMs = undefined,
  owner = "dy-alchemy-lock-manager",
  awsConfig = {},
  awsLogger = null
} = {}) => {
  let lockClient = null;
  const client = () => {
    if (lockClient == null) {
      const aws = AWS({ config: awsConfig, logger: awsLogger });
      lockClient = new DynamoDBLockClient.FailOpen({
        dynamodb: aws.get("DynamoDB.DocumentClient"),
        lockTable,
        partitionKey: 'id',
        leaseDurationMs,
        heartbeatPeriodMs,
        owner
      });
    }
    return lockClient;
  };

  return {
    lock: lockName => new Promise((resolve, reject) => client()
      .acquireLock(lockName, (err, lock) => {
        if (err) {
          return reject(err);
        }
        lock.on("error", error => Promise.resolve(error)
          .then(e => `Error: Failed to renew heartbeat for lock ${lockName}\n${e}`)
          // eslint-disable-next-line no-console
          .then(e => get(awsLogger, 'error', console.log)(e)));
        return resolve({
          release: () => new Promise((res, rej) => lock.release(e => (e ? rej(e) : res()))),
          fencingToken: lock.fencingToken
        });
      }))
  };
};
