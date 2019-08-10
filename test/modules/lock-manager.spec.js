const path = require('path');
const crypto = require('crypto');
const expect = require('chai').expect;
const nockBack = require('nock').back;
const timekeeper = require('timekeeper');
const lockManager = require('../../src/modules/lock-manager');

const cryptoRandomBytes = crypto.randomBytes;

const awsConfig = {
  region: 'us-west-2',
  accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
  secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
};

describe('Lock Manager Tests', () => {
  let locker;

  before(() => {
    nockBack.setMode('record');
    nockBack.fixtures = path.join(__dirname, '__cassettes');
    timekeeper.freeze(new Date(1893448800000));
    locker = lockManager('dy-alchemy-lock-table', {
      leaseDurationMs: 1000,
      awsConfig
    });
  });

  after(() => {
    timekeeper.reset();
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
    const nockDone = await new Promise((resolve) => nockBack('lock/basic.json', {}, resolve));
    const lock = await locker.lock('lock-name');
    await lock.release();
    await nockDone();
  }).timeout(10000);

  it('Testing Nested Locks', async () => {
    const nockDone = await new Promise((resolve) => nockBack('lock/nested.json', {}, resolve));
    const lockOuter = await locker.lock('lock-name-outer');
    const lockInner = await locker.lock('lock-name-inner');
    await lockInner.release();
    await lockOuter.release();
    await nockDone();
  }).timeout(10000);

  it('Testing Lock Timeout', async () => {
    const nockDone = await new Promise((resolve) => nockBack('lock/timeout.json', {}, resolve));
    const lock = await locker.lock('lock-name-timeout');
    await lock.release();
    await nockDone();
  }).timeout(10000);

  it('Testing Lock Failure', async () => {
    const nockDone = await new Promise((resolve) => nockBack('lock/failure.json', {}, resolve));
    try {
      await locker.lock('lock-failure');
    } catch (e) {
      expect(String(e)).to.equal('UnknownError: null');
    }
    await nockDone();
  }).timeout(10000);


  it('Testing Lock Release Failure', async () => {
    const nockDone = await new Promise((resolve) => nockBack('lock/releaseFailure.json', {}, resolve));
    const lock = await locker.lock('lock-release-failure');
    try {
      await lock.release();
    } catch (e) {
      expect(String(e)).to.equal('UnknownError: null');
    }
    await nockDone();
  }).timeout(10000);

  it('Testing Heartbeat Failure', async () => {
    const nockDone = await new Promise((resolve) => nockBack('lock/heartbeatFailure.json', {}, resolve));
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
    await nockDone();
  }).timeout(10000);
});
