const assert = require('assert');

const objectEncode = obj => Buffer.from(JSON.stringify(obj)).toString('base64');

const objectDecode = base64 => JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

module.exports.fromCursor = (cursor) => {
  let cursorPayload = {};
  if (cursor !== null) {
    try {
      cursorPayload = objectDecode(cursor);
    } catch (err) {
      assert(err.name === 'SyntaxError' && err.message.startsWith('Unexpected token'), err);
    }
  }
  const {
    lastEvaluatedKey, scanIndexForward, currentPage, limit
  } = cursorPayload;
  return {
    lastEvaluatedKey, scanIndexForward, currentPage, limit
  };
};

const toCursor = ({
  lastEvaluatedKey, scanIndexForward, currentPage, limit
}) => objectEncode({
  lastEvaluatedKey, scanIndexForward, currentPage, limit
});
module.exports.toCursor = toCursor;

module.exports.buildPageObject = (currentPage, limit, lastEvaluatedKey) => {
  const next = lastEvaluatedKey === null ? null : { limit };
  if (next !== null) {
    next.cursor = toCursor({
      lastEvaluatedKey,
      scanIndexForward: true,
      currentPage: currentPage + 1,
      ...next
    });
  }
  return {
    next,
    index: { current: currentPage },
    size: limit
  };
};
