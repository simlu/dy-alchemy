const path = require('path');
const expect = require('chai').expect;
const nockBack = require('nock').back;
const DynamoSdk = require('../../src/modules/sdk');


class CustomEntryExistsError extends Error {
  constructor(id) {
    super(`Entry exists: ${id}`);
  }
}

class CustomEntryNotFoundError extends Error {
  constructor(id) {
    super(`Entry not found: ${id}`);
  }
}

const CustomEntryExists = ({ id }) => new CustomEntryExistsError(id);
const CustomEntryNotFound = ({ id }) => new CustomEntryNotFoundError(id);

const awsConfig = {
  region: 'us-west-2',
  accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
  secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
describe('Dynamo Sdk Tests', () => {
  let callbackLog = [];
  const sdk = DynamoSdk({
    name: 'default',
    tableName: 'dy-alchemy-table',
    awsConfig,
    callback: ({ tableName, actionType, id }) => {
      callbackLog.push({ tableName, actionType, id });
    }
  });
  const customErrorMapSdk = DynamoSdk({
    name: 'customErrorMap',
    tableName: 'dy-alchemy-table',
    awsConfig,
    errorMap: {
      EntryExists: CustomEntryExists,
      EntryNotFound: CustomEntryNotFound
    }
  });

  before(() => {
    nockBack.setMode('record');
    nockBack.fixtures = path.join(__dirname, '__cassettes');
  });

  afterEach(() => {
    callbackLog = [];
  });

  it('Init With Defaults', () => {
    DynamoSdk({ name: '', tableName: '' });
  });

  const checkCallbackLog = (actionTypes) => {
    expect(callbackLog).to.deep.equal(actionTypes.map(actionType => ({
      id: 'uuid',
      tableName: 'dy-alchemy-table',
      actionType
    })));
  };

  describe('Testing Get', () => {
    it('Testing Get', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkGet.json', {}, resolve));
      expect(await sdk.get({ id: 'uuid', fields: 'keywords' })).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['get']);
      await nockDone();
    });

    it('Testing Get Custom Error Sdk (default callback coverage)', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkGet.json', {}, resolve));
      const result = await customErrorMapSdk.get({ id: 'uuid', fields: 'keywords' });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      await nockDone();
    });

    it('Testing Get EntryNotFound Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkGetNotFoundCustom.json', {}, resolve));
      try {
        await customErrorMapSdk.get({ id: 'uuid', fields: 'keywords' });
      } catch (err) {
        expect(err).instanceof(CustomEntryNotFoundError);
        expect(err.message).to.equal('Entry not found: uuid');
        await nockDone();
      }
    });

    it('Testing Get EntryNotFound Default', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkGetNotFoundDefault.json', {}, resolve));
      try {
        await sdk.get({ id: 'uuid', fields: 'keywords' });
      } catch (err) {
        expect(err).instanceof(DynamoSdk.DefaultEntryNotFoundError);
        expect(err.message).to.equal('Entry not found.');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Create', () => {
    it('Testing Create', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkCreate.json', {}, resolve));
      const result = await sdk.create({
        id: 'uuid',
        data: { keywords: ['keyword1', 'keyword2'] },
        fields: 'keywords'
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['create', 'get']);
      await nockDone();
    });

    it('Testing Create Entry Exists Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkCreateEntryExistsCustom.json', {}, resolve));
      try {
        await customErrorMapSdk.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err).instanceof(CustomEntryExistsError);
        expect(err.message).to.equal('Entry exists: uuid');
        await nockDone();
      }
    });

    it('Testing Create Entry Exists Default', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkCreateEntryExistsDefault.json', {}, resolve));
      try {
        await sdk.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err).instanceof(DynamoSdk.DefaultEntryExistsError);
        expect(err.message).to.equal('Entry exists.');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Update', () => {
    it('Testing Update', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkUpdate.json', {}, resolve));
      const result = await sdk.update({
        id: 'uuid',
        data: { keywords: ['keyword1'] },
        fields: 'keywords'
      });
      expect(result).to.deep.equal({ keywords: ['keyword1'] });
      checkCallbackLog(['update', 'get']);
      await nockDone();
    });

    it('Testing Update Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkUpdateNotFound.json', {}, resolve));
      try {
        await sdk.update({
          id: 'uuid',
          data: { keywords: ['keyword1'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err).instanceof(DynamoSdk.DefaultEntryNotFoundError);
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Delete', () => {
    it('Testing Delete', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkDelete.json', {}, resolve));
      await sdk.delete({ id: 'uuid' });
      checkCallbackLog(['delete']);
      await nockDone();
    });

    it('Testing Delete Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('sdkDeleteNotFound.json', {}, resolve));
      try {
        await sdk.delete({ id: 'uuid' });
      } catch (err) {
        expect(err).instanceof(DynamoSdk.DefaultEntryNotFoundError);
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });
});
