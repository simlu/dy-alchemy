const DynamoDBLockClient = require("dynamodb-lock-client");
const aws = require('aws-sdk-wrap');

let lockClient = null;
const client = () => {
  if (lockClient == null) {
    lockClient = new DynamoDBLockClient.FailOpen({
      dynamodb: aws.get("DynamoDB.DocumentClient"),
      lockTable: process.env.DYNAMO_LOCK_TABLE,
      partitionKey: 'id',
      leaseDurationMs: 10000,
      owner: "action-limiter-lock-manager"
    });
  }
  return lockClient;
};

module.exports = {
  createLock: lockName => new Promise((resolve, reject) => client()
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
