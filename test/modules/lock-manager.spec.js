const crypto = require('crypto');
const expect = require('chai').expect;
const { describe } = require('node-tdd');
const lockManager = require('../../src/modules/lock-manager');

const cryptoRandomBytes = crypto.randomBytes;

const awsConfig = {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.INTER_SERVICE_ACCESS_KEY_ID,
  secretAccessKey: process.env.INTER_SERVICE_SECRET_ACCESS_KEY
};

describe('Lock Manager Tests', { timestamp: 1893448800, useNock: true }, () => {
  let locker;

  before(() => {
    locker = lockManager('dy-alchemy-lock-table', {
      leaseDurationMs: 1000,
      awsConfig
    });
  });

  beforeEach(() => {
    let executionCount = 0;
    crypto.randomBytes = (size) => {
      executionCount += 1;

      let result = crypto.createHash('sha256').update('').update(String(executionCount)).digest();
      while (result.length < size) {
        result = Buffer.concat([result, crypto.createHash('sha256').update(result).digest()]);
      }

      return result.slice(0, size);
    };
  });

  afterEach(() => {
    crypto.randomBytes = cryptoRandomBytes;
  });

  it('Init With Defaults', () => {
    lockManager('');
  });

  it('Testing Basic Setup', async () => {
    const lock = await locker.lock('lock-name');
    await lock.release();
  }).timeout(10000);

  it('Testing Nested Locks', async () => {
    const lockOuter = await locker.lock('lock-name-outer');
    const lockInner = await locker.lock('lock-name-inner');
    await lockInner.release();
    await lockOuter.release();
  }).timeout(10000);

  it('Testing Lock Timeout', async () => {
    const lock = await locker.lock('lock-name-timeout');
    await lock.release();
  }).timeout(10000);

  it('Testing Lock Failure', async () => {
    try {
      await locker.lock('lock-failure');
    } catch (e) {
      expect(String(e)).to.equal('UnknownError: null');
    }
  }).timeout(10000);

  it('Testing Lock Release Failure', async () => {
    const lock = await locker.lock('lock-release-failure');
    try {
      await lock.release();
    } catch (e) {
      expect(String(e)).to.equal('UnknownError: null');
    }
  }).timeout(10000);

  it('Testing Heartbeat Failure', async () => {
    const logs = [];
    const lockerHeartbeat = lockManager('dy-alchemy-lock-table', {
      leaseDurationMs: 1000,
      heartbeatPeriodMs: 600,
      awsConfig,
      awsLogger: { error: (msg) => logs.push(msg) }
    });
    await lockerHeartbeat.lock('lock-name-heartbeat-failure');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(logs).to.deep
      .equal(['Error: Failed to renew heartbeat for lock lock-name-heartbeat-failure\nUnknownError: null']);
  }).timeout(10000);
});
