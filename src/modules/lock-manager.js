const DynamoDBLockClient = require("dynamodb-lock-client");
const AWS = require('aws-sdk-wrap');

module.exports = (lockTable, {
  leaseDurationMs = 10000,
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
        // eslint-disable-next-line no-console
        lock.on("error", e => console.log(`Error: Failed to renew heartbeat for lock ${lockName}\n${e}`));
        return resolve({
          release: () => new Promise((res, rej) => lock.release(e => (e ? rej(e) : res()))),
          fencingToken: lock.fencingToken
        });
      }))
  };
};
