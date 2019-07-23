const { expect } = require('chai');
const projectionUtil = require('../../src/util/projection');

describe('Testing Projection Util', () => {
  it('Testing Format List.', () => {
    expect(projectionUtil.format(['one', 'two'])).to.deep.equal(['one', 'two']);
  });

  it('Testing Format String.', () => {
    expect(projectionUtil.format('one,two')).to.deep.equal(['one', 'two']);
  });
});
