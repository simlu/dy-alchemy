const expect = require('chai').expect;
const { describe } = require('node-tdd');
const { evaluate, extract, validate } = require('../../src/util/conditional');
const { InvalidCondition, ConditionNotImplemented } = require('../../src/modules/errors');

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
        lowerBound: 1,
        upperBound: 3
      }, {
        id: 2
      })).to.equal(true);
    });

    it('Testing eval "Membership"', () => {
      expect(evaluate({
        subject: 'id',
        type: 'Membership',
        values: ['56629a41-b24b-42c6-9f02-277412e96d25']
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25',
        subject: 'id'
      })).to.equal(true);
    });

    it('Testing eval "Not"', () => {
      expect(evaluate({
        type: 'Not',
        condition: { object: '56629a41-b24b-42c6-9f02-277412e96d25', type: 'Equals', subject: 'id' }
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(false);
    });

    it('Testing eval "And"', () => {
      expect(evaluate({
        type: 'And',
        conditions: [{ object: '56629a41-b24b-42c6-9f02-277412e96d25', type: 'Equals', subject: 'id' }]
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "Or"', () => {
      expect(evaluate({
        type: 'Or',
        conditions: [{ object: '56629a41-b24b-42c6-9f02-277412e96d25', type: 'Equals', subject: 'id' }]
      }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });

    it('Testing eval "Function"', (done) => {
      try {
        evaluate({
          subject: 'id',
          type: 'Function',
          name: 'attribute_exists'
        }, {
          id: '56629a41-b24b-42c6-9f02-277412e96d25'
        });
      } catch (err) {
        expect(err).instanceOf(ConditionNotImplemented);
        expect(err.message).to.equal('Condition not implemented');
        done();
      }
    });
  });

  describe('Testing extract', () => {
    [
      'Equals',
      'NotEquals',
      'LessThan',
      'LessThanOrEqualTo',
      'GreaterThan',
      'GreaterThanOrEqualTo'
    ]
      .forEach((c) => {
        it(`Testing extract "${c}"`, () => {
          expect(extract({
            subject: 'id',
            type: `${c}`,
            object: '56629a41-b24b-42c6-9f02-277412e96d25'
          })).to.deep.equal(['id']);
        });
      });

    it('Testing extract "Between"', () => {
      expect(extract({
        subject: 'id',
        type: 'Between',
        lowerBound: '56629a41-b24b-42c6-9f02-277412e96d25',
        upperBound: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.deep.equal(['id']);
    });

    it('Testing extract "Membership"', () => {
      expect(extract({
        subject: 'id',
        type: 'Membership',
        values: ['56629a41-b24b-42c6-9f02-277412e96d25']
      })).to.deep.equal(['id']);
    });

    it('Testing extract "Not"', () => {
      expect(extract({
        type: 'Not',
        condition: { object: '56629a41-b24b-42c6-9f02-277412e96d25', type: 'Equals', subject: 'id' }
      })).to.deep.equal(['id']);
    });

    ['And', 'Or'].forEach((c) => {
      it(`Testing extract "${c}"`, () => {
        expect(extract({
          type: `${c}`,
          conditions: [{ object: '56629a41-b24b-42c6-9f02-277412e96d25', type: 'Equals', subject: 'id' }]
        })).to.deep.equal(['id']);
      });
    });

    it('Testing extract "Function"', (done) => {
      try {
        extract({
          subject: 'id',
          type: 'Function',
          name: 'contains',
          expected: '56629a41'
        });
      } catch (err) {
        expect(err).instanceOf(ConditionNotImplemented);
        expect(err.message).to.equal('Condition not implemented');
        done();
      }
    });
  });

  describe('Testing validate', () => {
    it('Testing validate unknown type', (done) => {
      try {
        validate({
          subject: 'id',
          type: 'Default',
          object: '56629a41-b24b-42c6-9f02-277412e96d25'
        }, {
          id: '56629a41-b24b-42c6-9f02-277412e96d25'
        });
      } catch (err) {
        expect(err).instanceOf(InvalidCondition);
        expect(err.message).to.contain('Invalid condition provided');
        done();
      }
    });

    it('Testing validate "Equals"', () => {
      expect(() => validate({
        subject: 'id',
        type: 'Equals',
        object: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.not.throw();
    });

    it('Testing validate "Not And Simple', () => {
      expect(() => validate({
        type: 'Not',
        condition: {
          type: 'And',
          conditions: [{
            subject: 'id',
            type: 'Equals',
            object: '56629a41-b24b-42c6-9f02-277412e96d25'
          }]
        }
      })).to.not.throw();
    });

    it('Testing validate "Or Not Simple', () => {
      expect(() => validate({
        type: 'Or',
        conditions: [{
          type: 'Not',
          condition: {
            subject: 'id',
            type: 'Equals',
            object: '56629a41-b24b-42c6-9f02-277412e96d25'
          }
        }]
      })).to.not.throw();
    });
  });
});
