const path = require('path');
const crypto = require('crypto');
const expect = require('chai').expect;
const nockBack = require('nock').back;
const lockManager = require("../../src/modules/lock-manager");

const cryptoRandomBytes = crypto.randomBytes;

describe("Lock Manager Tests", () => {
  let locker;

  before(() => {
    nockBack.setMode('record');
    nockBack.fixtures = path.join(__dirname, "__cassettes");
    locker = lockManager("dy-alchemy-lock-table", {
      awsConfig: {
        region: "us-west-2",
        accessKeyId: "XXXXXXXXXXXXXXXXXXXX",
        secretAccessKey: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    });
  });

  beforeEach(() => {
    let executionCount = 0;
    crypto.randomBytes = (size) => {
      executionCount += 1;

      let result = crypto.createHash('sha256').update("").update(String(executionCount)).digest();
      while (result.length < size) {
        result = Buffer.concat([result, crypto.createHash('sha256').update(result).digest()]);
      }

      return result.slice(0, size);
    };
  });
  afterEach(() => {
    crypto.randomBytes = cryptoRandomBytes;
  });

  it("Testing Basic Setup", async () => {
    const nockDone = await new Promise(resolve => nockBack('lock-basic.json', {}, resolve));
    const lock = await locker.lock("lock-name");
    await lock.release();
    await nockDone();
  }).timeout(10000);
});
