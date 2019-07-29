class DefaultItemNotFoundError extends Error {
  constructor() {
    super('Item not found.');
  }
}
module.exports.DefaultItemNotFoundError = DefaultItemNotFoundError;

class DefaultItemExists extends Error {
  constructor() {
    super('Item exists.');
  }
}
module.exports.DefaultItemExistsError = DefaultItemExists;

class InvalidPageCursor extends Error {
  constructor() {
    super('Invalid Page Cursor.');
  }
}
module.exports.InvalidPageCursor = InvalidPageCursor;

class InvalidCondition extends Error {
  constructor(context) {
    super(`Invalid condition provided\n${context}`);
  }
}
module.exports.InvalidCondition = InvalidCondition;

class ConditionNotImplemented extends Error {
  constructor() {
    super('Condition not implemented');
  }
}
module.exports.ConditionNotImplemented = ConditionNotImplemented;
