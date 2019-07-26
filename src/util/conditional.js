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
    case 'Function':
      throw new Error('Not implemented');
    case 'Not':
      return !evaluate(condition.condition, object);
    case 'And':
      return condition.conditions.map(cond => evaluate(cond, object)).every(e => e === true);
    case 'Or':
      return condition.conditions.map(cond => evaluate(cond, object)).some(e => e === true);
    default:
      throw new Error(`Unknown condition type "${condition.type}" provided`);
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
    case 'Function':
      throw new Error('Not implemented');
    case 'Not':
      return extract(condition.condition);
    case 'And':
    case 'Or':
      return [...condition.conditions.map(cond => extract(cond))];
    default:
      throw new Error(`Unknown condition type "${condition.type}" provided`);
  }
};
module.exports.extract = extract;
