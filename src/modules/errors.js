class DefaultEntryNotFoundError extends Error {
  constructor() {
    super('Entry not found.');
  }
}
module.exports.DefaultEntryNotFoundError = DefaultEntryNotFoundError;

class DefaultEntryExistsError extends Error {
  constructor() {
    super('Entry exists.');
  }
}
module.exports.DefaultEntryExistsError = DefaultEntryExistsError;
