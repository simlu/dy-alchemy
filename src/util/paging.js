const objectEncode = obj => Buffer.from(JSON.stringify(obj)).toString('base64');

const objectDecode = base64 => JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

module.exports.fromCursor = (cursor) => {
  const {
    lastEvaluatedKey, scanIndexForward, currentPage, limit
  } = cursor === null ? {} : objectDecode(cursor);
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
  const previous = currentPage === 1 ? null : { limit };
  if (previous !== null) {
    previous.cursor = toCursor({
      lastEvaluatedKey,
      scanIndexForward: false,
      currentPage: currentPage - 1,
      ...previous
    });
  }
  return {
    next,
    previous,
    index: { current: currentPage },
    size: limit
  };
};
