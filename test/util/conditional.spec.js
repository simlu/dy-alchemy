const expect = require('chai').expect;
const { evaluate, extract } = require('../../src/util/conditional');

describe('Testing conditional.js', () => {
  describe('Testing evaluate', () => {
    it('Testing eval "Equals"', () => {
      expect(evaluate({ subject: 'id', type: 'Equals', object: '56629a41-b24b-42c6-9f02-277412e96d25' }, {
        id: '56629a41-b24b-42c6-9f02-277412e96d25'
      })).to.equal(true);
    });
  });

  describe('Testing extract', () => {
    it('Testing extract "Equals"', () => {
      expect(extract({ subject: 'id', type: 'Equals', object: '56629a41-b24b-42c6-9f02-277412e96d25' }))
        .to.deep.equal(['id']);
    });
  });
});
