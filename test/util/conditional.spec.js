const expect = require('chai').expect;
const { evaluate, extract } = require('../../src/util/conditional');
const { UnknownConditionType, ConditionNotImplemented } = require('../../src/modules/errors');

describe('Testing conditional.js', () => {
  describe('Testing evaluate', () => {
    it('Testing eval "Equals"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Equals',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "NotEquals"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'NotEquals',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(false);
    });

    it('Testing eval "LessThan"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'LessThan',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(false);
    });

    it('Testing eval "LessThanOrEqualTo"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'LessThanOrEqualTo',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "GreaterThan"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'GreaterThan',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(false);
    });

    it('Testing eval "GreaterThanOrEqualTo"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'GreaterThanOrEqualTo',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "Between"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Between',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        lowerBound: '409688ba-e6d9-48c9-942d-f03c6f82778d',
        upperBound: 'c3283561-408a-44d2-91d0-b0115ba9773a'
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25',
        subject: 'id'
      })).to.equal(true);
    });

    it('Testing eval "Membership"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Membership',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        values: ['id']
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25',
        subject: 'id'
      })).to.equal(false);
    });

    it('Testing eval "Not"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Not',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        condition: { type: 'Equals' }
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(false);
    });

    it('Testing eval "And"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'And',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        conditions: [{ type: 'Equals' }]
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "Or"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Or',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        conditions: [{ type: 'Equals' }]
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "Function"', () => {
      try {
        evaluate({
          subject: 'id',
          type: 'Function',
          object: '56629a41-b24b-42c6-9f02-277412e96d25'
        }, {
          id: '56629a41-b24b-42c6-9f02-277412e96d25'
        });
      } catch (err) {
        expect(err).instanceOf(ConditionNotImplemented);
        expect(err.message).to.equal('Condition not implemented');
      }
    });

    it('Testing eval "Default"', () => {
      try {
        evaluate({
          subject: 'id',
          type: 'Default',
          object: '56629a41-b24b-42c6-9f02-277412e96d25'
        }, {
          id: '56629a41-b24b-42c6-9f02-277412e96d25'
        });
      } catch (err) {
        expect(err).instanceOf(UnknownConditionType);
        expect(err.message).to.equal('Unknown condition type "Default" provided');
      }
    });
  });

  describe('Testing extract', () => {
    it('Testing extract "Equals"', () => {
      expect(extract({
        subject: 'id',
        type: 'Equals',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.deep.equal(['id']);
    });

    it('Testing extract "Membership"', () => {
      expect(extract({
        subject: 'id',
        type: 'Membership',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.deep.equal(['id']);
    });

    it('Testing extract "Not"', () => {
      expect(extract({
        subject: 'id',
        type: 'Not',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        condition: {
          subject: 'id',
          type: 'Equals',
          object: '56629a41-b24b-42c6-9f02-277412e96d25'
        }
      })).to.deep.equal(['id']);
    });

    it('Testing extract "Or"', () => {
      expect(extract({
        subject: 'id',
        type: 'Or',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        conditions: [{ type: 'Equals', subject: 'id' }]
      })).to.deep.equal([['id']]);
    });

    it('Testing extract "And"', () => {
      expect(extract({
        subject: 'id',
        type: 'And',
        object: '56629a41-b24b-42c6-9f02-277412e96d25',
        conditions: [{ type: 'Equals', subject: 'id' }]
      })).to.deep.equal([['id']]);
    });
  });

  it('Testing extract "Function"', () => {
    try {
      extract({
        subject: 'id',
        type: 'Function',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      });
    } catch (err) {
      expect(err).instanceOf(ConditionNotImplemented);
      expect(err.message).to.equal('Condition not implemented');
    }
  });

  it('Testing extract "Default"', () => {
    try {
      extract({
        subject: 'id',
        type: 'Default',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      });
    } catch (err) {
      expect(err).instanceOf(UnknownConditionType);
      expect(err.message).to.equal('Unknown condition type "Default" provided');
    }
  });
});
