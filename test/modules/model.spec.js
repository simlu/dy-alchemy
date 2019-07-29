const path = require('path');
const expect = require('chai').expect;
const nockBack = require('nock').back;
const DynamoModel = require('../../src/modules/model');
const {
  DefaultItemExistsError, DefaultItemNotFoundError,
  InvalidPageCursor,
  CannotUpdatePrimaryKeys, IncompletePrimaryKey, MustProvideIdXorPrimaryKeys
} = require('../../src/modules/errors');


class CustomItemExistsError extends Error {
  constructor(id) {
    super(`Item exists: ${id}`);
  }
}

class CustomItemNotFoundError extends Error {
  constructor(id) {
    super(`Item not found: ${id}`);
  }
}

const CustomItemExists = ({ id }) => new CustomItemExistsError(id);
const CustomItemNotFound = ({ id }) => new CustomItemNotFoundError(id);

const schema = {
  id: {
    type: 'String',
    keyType: 'HASH'
  },
  title: {
    type: 'String'
  },
  year: {
    type: 'Number'
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
  const defaultModel = new DynamoModel({
    modelName: 'default',
    tableName: 'dy-alchemy-table',
    schema,
    awsConfig,
    callback: (args) => {
      callbackLog.push(args);
    }
  });
  const customErrorModel = new DynamoModel({
    modelName: 'customErrorMap',
    tableName: 'dy-alchemy-table',
    schema,
    awsConfig,
    errorMap: {
      ItemExists: CustomItemExists,
      ItemNotFound: CustomItemNotFound
    }
  });
  const autoIdModel = new DynamoModel({
    modelName: 'default',
    tableName: 'dy-alchemy-table',
    schema,
    awsConfig,
    callback: (args) => {
      callbackLog.push(args);
    },
    primaryKeys: ['keywords', 'title']
  });

  before(() => {
    nockBack.setMode('record');
    nockBack.fixtures = path.join(__dirname, '__cassettes');
  });

  afterEach(() => {
    callbackLog = [];
  });

  it('Init With Defaults', () => {
    // eslint-disable-next-line no-new
    new DynamoModel({ modelName: '', tableName: '', schema });
  });

  it('Testing precheck', async () => {
    const model = new DynamoModel({ modelName: 'model', awsConfig, schema });
    try {
      await model.get({ id: 'uuid', fields: ['keywords'] });
    } catch (err) {
      expect(err.message).to.equal('Missing required value: tableName');
    }
  });

  const checkCallbackLog = (actionTypes, id = 'uuid') => {
    expect(callbackLog).to.deep.equal(actionTypes.map(actionType => ({
      id,
      modelName: 'default',
      tableName: 'dy-alchemy-table',
      actionType
    })));
  };

  describe('Testing Get', () => {
    it('Testing Get Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/get.json', {}, resolve));
      expect(await defaultModel.get({ id: 'uuid', fields: ['keywords'] }))
        .to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['get']);
      await nockDone();
    });

    it('Testing Get Custom Error Sdk (default callback coverage)', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/get.json', {}, resolve));
      const result = await customErrorModel.get({ id: 'uuid', fields: ['keywords'] });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      await nockDone();
    });

    it('Testing Get ItemNotFound Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getNotFoundCustom.json', {}, resolve));
      try {
        await customErrorModel.get({ id: 'uuid', fields: ['keywords'] });
      } catch (err) {
        expect(err).instanceof(CustomItemNotFoundError);
        expect(err.message).to.equal('Item not found: uuid');
        await nockDone();
      }
    });

    it('Testing Get ItemNotFound Default', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getNotFoundDefault.json', {}, resolve));
      try {
        await defaultModel.get({ id: 'uuid', fields: ['keywords'] });
      } catch (err) {
        expect(err).instanceof(DefaultItemNotFoundError);
        expect(err.message).to.equal('Item not found.');
        checkCallbackLog([]);
        await nockDone();
      }
    });

    it('Testing Get Error', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/getError.json', {}, resolve));
      try {
        await defaultModel.get({ id: 'uuid', fields: ['keywords'] });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Create', () => {
    it('Testing Create Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/create.json', {}, resolve));
      const result = await defaultModel.create({
        id: 'uuid',
        data: { keywords: ['keyword1', 'keyword2'] },
        fields: ['keywords']
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['create', 'get']);
      await nockDone();
    });

    it('Testing Create with Automatic Id', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createAutoId.json', {}, resolve));
      const result = await autoIdModel.create({
        data: {
          keywords: ['keyword1', 'keyword2'],
          title: 'title'
        },
        fields: ['keywords']
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['create', 'get'], 'aca3ddb278ff58d7ac44cebd96802b3e66528910');
      await nockDone();
    });

    it('Testing Create IncompletePrimaryKey', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createIncompletePrimaryKey.json', {}, resolve));
      try {
        await autoIdModel.create({
          data: {
            keywords: ['keyword1', 'keyword2']
          },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(IncompletePrimaryKey);
        await nockDone();
      }
    });

    it('Testing Create Both Provided Id and Primary Key', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createProvidedIdAndPrimaryKey.json', {}, resolve));
      try {
        await autoIdModel.create({
          id: 'uuid',
          data: {
            keywords: ['keyword1', 'keyword2']
          },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(MustProvideIdXorPrimaryKeys);
        await nockDone();
      }
    });

    it('Testing Create Item Exists Custom', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createItemExistsCustom.json', {}, resolve));
      try {
        await customErrorModel.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(CustomItemExistsError);
        expect(err.message).to.equal('Item exists: uuid');
        await nockDone();
      }
    });

    it('Testing Create Item Exists Default', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/createItemExistsDefault.json', {}, resolve));
      try {
        await defaultModel.create({
          id: 'uuid',
          data: { keywords: ['keyword1', 'keyword2'] },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(DefaultItemExistsError);
        expect(err.message).to.equal('Item exists.');
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
          fields: ['keywords']
        });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Update', () => {
    it('Testing Update Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/update.json', {}, resolve));
      const result = await defaultModel.update({
        id: 'uuid',
        data: { keywords: ['keyword1'] },
        fields: ['keywords']
      });
      expect(result).to.deep.equal({ keywords: ['keyword1'] });
      checkCallbackLog(['update', 'get']);
      await nockDone();
    });

    it('Testing Update with Condition', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/updateWithCondition.json', {}, resolve));
      const result = await defaultModel.update({
        id: 'uuid',
        data: { keywords: ['keyword1'] },
        fields: ['keywords'],
        conditions: [{ subject: 'title', type: 'Equals', object: 'title-name' }]
      });
      expect(result).to.deep.equal({ keywords: ['keyword1'] });
      checkCallbackLog(['update', 'get']);
      await nockDone();
    });

    it('Testing Update Primary Key', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/updatePrimaryKey.json', {}, resolve));
      try {
        await autoIdModel.update({
          id: 'uuid',
          data: { keywords: ['keyword1'] },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(CannotUpdatePrimaryKeys);
        await nockDone();
      }
    });

    it('Testing Update Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/updateNotFound.json', {}, resolve));
      try {
        await defaultModel.update({
          id: 'uuid',
          data: { keywords: ['keyword1'] },
          fields: ['keywords']
        });
      } catch (err) {
        expect(err).instanceof(DefaultItemNotFoundError);
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
          fields: ['keywords']
        });
      } catch (err) {
        expect(err.code).to.equal('UnknownError');
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });

  describe('Testing Upsert', () => {
    it('Testing Upsert Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/upsert.json', {}, resolve));
      const result = await defaultModel.upsert({
        id: 'uuid',
        data: { keywords: ['keyword1', 'keyword2'] },
        fields: ['keywords']
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['upsert', 'get']);
      await nockDone();
    });

    it('Testing Upsert with Automatic Id', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/upsertAutoId.json', {}, resolve));
      const result = await autoIdModel.upsert({
        data: {
          keywords: ['keyword1', 'keyword2'],
          title: 'title'
        },
        fields: ['keywords']
      });
      expect(result).to.deep.equal({ keywords: ['keyword1', 'keyword2'] });
      checkCallbackLog(['upsert', 'get'], 'aca3ddb278ff58d7ac44cebd96802b3e66528910');
      await nockDone();
    });
  });

  describe('Testing Delete', () => {
    it('Testing Delete Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/delete.json', {}, resolve));
      await defaultModel.delete({ id: 'uuid' });
      checkCallbackLog(['delete']);
      await nockDone();
    });

    it('Testing Delete with Condition', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/deleteWithCondition.json', {}, resolve));
      await defaultModel.delete({
        id: 'uuid',
        conditions: [{ subject: 'title', type: 'Equals', object: 'title-name' }]
      });
      checkCallbackLog(['delete']);
      await nockDone();
    });

    it('Testing Delete Not Found', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/deleteNotFound.json', {}, resolve));
      try {
        await defaultModel.delete({ id: 'uuid' });
      } catch (err) {
        expect(err).instanceof(DefaultItemNotFoundError);
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
    it('Testing List Base Case', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/list.json', {}, resolve));
      const result = await defaultModel.list({
        indexName: 'index-name',
        indexMap: { title: 'title', year: 1980 },
        fields: ['id', 'title']
      });
      expect(result).to.deep.equal({
        payload: [{ id: 'uuid', title: 'title' }],
        page: {
          next: null,
          index: { current: 1 },
          size: 20
        }
      });
      checkCallbackLog(['list']);
      await nockDone();
    });

    it('Testing List without Id', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/listWithoutId.json', {}, resolve));
      const result = await defaultModel.list({
        indexName: 'index-name',
        indexMap: { title: 'title', year: 1980 },
        fields: ['title']
      });
      expect(result).to.deep.equal({
        payload: [{ title: 'title' }],
        page: {
          next: null,
          index: { current: 1 },
          size: 20
        }
      });
      checkCallbackLog(['list']);
      await nockDone();
    });

    it('Testing List with Paging', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/listWithPaging.json', {}, resolve));
      const result = await defaultModel.list({
        indexName: 'index-name',
        indexMap: { title: 'title', year: 1980 },
        fields: ['id', 'title'],
        limit: 1,
        cursor: 'eyJsYXN0RXZhbHVhdGVkS2V5Ijp7ImlkIjoidXVpZCIsInRpdGxlIjoidGl0bGUiLCJ5ZWFyIjoxOTgwfSwic2'
          + 'NhbkluZGV4Rm9yd2FyZCI6dHJ1ZSwibGltaXQiOjEsImN1cnJlbnRQYWdlIjoyfQ=='
      });
      expect(result).to.deep.equal({
        payload: [{ id: 'uuid', title: 'title' }],
        page: {
          next: {
            limit: 1,
            cursor: 'eyJsYXN0RXZhbHVhdGVkS2V5Ijp7ImlkIjoidXVpZCIsInRpdGxlIjoidGl0bGUiLCJ5ZWFyIjoxOTgwfSwi'
              + 'c2NhbkluZGV4Rm9yd2FyZCI6dHJ1ZSwiY3VycmVudFBhZ2UiOjMsImxpbWl0IjoxfQ=='
          },
          index: { current: 2 },
          size: 1
        }
      });
      checkCallbackLog(['list']);
      await nockDone();
    });

    it('Testing List with Invalid Cursor', async () => {
      const nockDone = await new Promise(resolve => nockBack('model/listInvalidCursor.json', {}, resolve));
      try {
        await defaultModel.list({
          indexName: 'index-name',
          indexMap: { title: 'title', year: 1980 },
          fields: ['id', 'title'],
          cursor: '--invalid--'
        });
      } catch (err) {
        expect(err).to.be.instanceOf(InvalidPageCursor);
        checkCallbackLog([]);
        await nockDone();
      }
    });
  });
});
