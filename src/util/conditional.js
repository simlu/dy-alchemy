const { UnknownConditionType, ConditionNotImplemented } = require('../modules/errors');

const evaluate = (condition, object) => {
  switch (condition.type) {
    case 'Equals':
      return object[condition.subject] === condition.object;
    case 'NotEquals':
      return object[condition.subject] !== condition.object;
    case 'LessThan':
      return object[condition.subject] < condition.object;
    case 'LessThanOrEqualTo':
      return object[condition.subject] <= condition.object;
    case 'GreaterThan':
      return object[condition.subject] > condition.object;
    case 'GreaterThanOrEqualTo':
      return object[condition.subject] >= condition.object;
    case 'Between':
      return condition.lowerBound <= object[condition.subject]
        && object[condition.subject] <= condition.upperBound;
    case 'Membership':
      return condition.values.includes(object[condition.subject]);
    case 'Not':
      return !evaluate(condition.condition, object);
    case 'And':
      return condition.conditions.map(cond => evaluate(cond, object)).every(e => e === true);
    case 'Or':
      return condition.conditions.map(cond => evaluate(cond, object)).some(e => e === true);
    case 'Function':
      throw new ConditionNotImplemented();
    default:
      throw new UnknownConditionType(condition.type);
  }
};
module.exports.evaluate = evaluate;

const extract = (condition) => {
  switch (condition.type) {
    case 'Equals':
    case 'NotEquals':
    case 'LessThan':
    case 'LessThanOrEqualTo':
    case 'GreaterThan':
    case 'GreaterThanOrEqualTo':
    case 'Between':
    case 'Membership':
      return [condition.subject];
    case 'Not':
      return extract(condition.condition);
    case 'And':
    case 'Or':
      return [...condition.conditions.map(cond => extract(cond))];
    case 'Function':
      throw new ConditionNotImplemented();
    default:
      throw new UnknownConditionType(condition.type);
  }
};
module.exports.extract = extract;
