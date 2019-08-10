module.exports = () => {
  class Class {
    constructor(kwargs) {
      Object.assign(this, kwargs);
    }
  }
  return Class;
};
