const path = require('path');
const expect = require('chai').expect;
const nockBack = require('nock').back;
const DynamoModel = require('../../src/modules/model');
const { DefaultEntryExistsError, DefaultEntryNotFoundError } = require('../../src/modules/errors');


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

const schema = {
  id: {
    type: 'String',
    keyType: 'HASH'
  },
  title: {
    type: 'String'
  },
  keywords: {
    type: 'List',
    memberType: { type: 'String' }
  }
};

const awsConfig = {
  region: 'us-west-2',
  accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
  secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
};
describe('Dynamo Sdk Tests', () => {
  let callbackLog = [];
  const defaultModel = DynamoModel({
    schema,
    modelName: 'default',
    tableName: 'dy-alchemy-table',
    awsConfig,
    callback: (args) => {
      callbackLog.push(args);
    }
  });
  const customErrorModel = DynamoModel({
    schema,
    modelName: 'customErrorMap',
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
    DynamoModel({ modelName: '', tableName: '' });
  });

  it('Testing precheck', async () => {
    const model = DynamoModel({ modelName: 'model', awsConfig });
    try {
      await model.get({ id: 'uuid', fields: 'keywords' });
    } catch (err) {
      expect(err.message).to.equal('Missing required value: tableName');
    }
  });

  const checkCallbackLog = (actionTypes) => {
    expect(callbackLog).to.deep.equal(actionTypes.map(actionType => ({
      id: 'uuid',
      modelName: 'default',
      tableName: 'dy-alchemy-table',
      actionType
    })));
  };

  describe('Testing Get', () => {
    it('Testing Get', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/get.json', {}, resolve));
      expect(await defaultModel.get({ id: 'uuid', fields: 'keywords' }))
        .to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['get']);
      await nockDone();
    });

    it('Testing Get Custom Error Sdk (default callback coverage)', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/get.json', {}, resolve));
      const result = await customErrorModel.get({ id: 'uuid', fields: 'keywords' });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      await nockDone();
    });

    it('Testing Get EntryNotFound Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getNotFoundCustom.json', {}, resolve));
      try {
        await customErrorModel.get({ id: 'uuid', fields: 'keywords' });
      } catch (err) {
        expect(err).instanceof(CustomEntryNotFoundError);
        expect(err.message).to.equal('Entry not found: uuid');
        await nockDone();
      }
    });

    it('Testing Get EntryNotFound Default', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getNotFoundDefault.json', {}, resolve));
      try {
        await defaultModel.get({ id: 'uuid', fields: 'keywords' });
      } catch (err) {
        expect(err).instanceof(DefaultEntryNotFoundError);
        expect(err.message).to.equal('Entry not found.');
        checkCallbackLog([]);
        await nockDone();
      }
    });

    it('Testing Get Error', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getError.json', {}, resolve));
      try {
        await defaultModel.get({ id: 'uuid', fields: 'keywords' });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Create', () => {
    it('Testing Create', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/create.json', {}, resolve));
      const result = await defaultModel.create({
        id: 'uuid',
        data: { keywords: ['keyword1', 'keyword2'] },
        fields: 'keywords'
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['create', 'get']);
      await nockDone();
    });

    it('Testing Create Entry Exists Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createEntryExistsCustom.json', {}, resolve));
      try {
        await customErrorModel.create({
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
      const nockDone = await new Promise(resolve => nockBack('model/createEntryExistsDefault.json', {}, resolve));
      try {
        await defaultModel.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err).instanceof(DefaultEntryExistsError);
        expect(err.message).to.equal('Entry exists.');
        checkCallbackLog([]);
        await nockDone();
      }
    });

    it('Testing Create Error', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createError.json', {}, resolve));
      try {
        await defaultModel.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Update', () => {
    it('Testing Update', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/update.json', {}, resolve));
      const result = await defaultModel.update({
        id: 'uuid',
        data: { keywords: ['keyword1'] },
        fields: 'keywords'
      });
      expect(result).to.deep.equal({ keywords: ['keyword1'] });
      checkCallbackLog(['update', 'get']);
      await nockDone();
    });

    it('Testing Update Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/updateNotFound.json', {}, resolve));
      try {
        await defaultModel.update({
          id: 'uuid',
          data: { keywords: ['keyword1'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err).instanceof(DefaultEntryNotFoundError);
        checkCallbackLog([]);
        await nockDone();
      }
    });

    it('Testing Update Error', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/updateError.json', {}, resolve));
      try {
        await defaultModel.update({
          id: 'uuid',
          data: { keywords: ['keyword1'] },
          fields: 'keywords'
        });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Delete', () => {
    it('Testing Delete', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/delete.json', {}, resolve));
      await defaultModel.delete({ id: 'uuid' });
      checkCallbackLog(['delete']);
      await nockDone();
    });

    it('Testing Delete Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/deleteNotFound.json', {}, resolve));
      try {
        await defaultModel.delete({ id: 'uuid' });
      } catch (err) {
        expect(err).instanceof(DefaultEntryNotFoundError);
        checkCallbackLog([]);
        await nockDone();
      }
    });

    it('Testing Delete Error', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/deleteError.json', {}, resolve));
      try {
        await defaultModel.delete({ id: 'uuid' });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing List', () => {
    it('Testing List', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/list.json', {}, resolve));
      const modelList = await defaultModel.list({
        indexName: 'index-name',
        indexMap: { title: 'title', year: 1980 },
        fields: 'title'
      });
      expect(modelList).to.deep.equal([{ title: 'title' }]);
      await nockDone();
    }).timeout(50000);
  });
});
