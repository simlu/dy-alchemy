const objectEncode = obj => Buffer.from(JSON.stringify(obj)).toString('base64');

const objectDecode = base64 => JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

module.exports.fromCursor = (cursor) => {
  const {
    lastEvaluatedKey, limit, scanIndexForward, currentPage
  } = cursor === null ? {} : objectDecode(cursor);
  return {
    lastEvaluatedKey, limit, scanIndexForward, currentPage
  };
};

const toCursor = ({
  lastEvaluatedKey, scanIndexForward, limit, currentPage
}) => objectEncode({
  lastEvaluatedKey, scanIndexForward, limit, currentPage
});
module.exports.toCursor = toCursor;

module.exports.buildPageObject = (currentPage, limit, lastEvaluatedKey) => {
  const next = lastEvaluatedKey === null ? null : { limit };
  if (next !== null) {
    next.cursor = toCursor({
      scanIndexForward: true,
      lastEvaluatedKey,
      currentPage: currentPage + 1,
      ...next
    });
  }
  const previous = currentPage === 1 ? null : { limit };
  if (previous !== null) {
    previous.cursor = toCursor({
      scanIndexForward: false,
      lastEvaluatedKey,
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
