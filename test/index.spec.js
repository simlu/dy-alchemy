const expect = require('chai').expect;
const { describe } = require('node-tdd');
const index = require('../src/index');

describe('Lock index.js', () => {
  it('Testing exports', () => {
    expect(Object.keys(index).sort()).to.deep.equal(['Model', 'errors', 'lockManager']);
  });
});
