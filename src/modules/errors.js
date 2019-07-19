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
