const Joi = require('joi-strict');
const { InvalidCondition, ConditionNotImplemented } = require('../modules/errors');

const schema = (() => {
  const conditionSimple = Joi.alternatives(
    Joi.object().keys({
      subject: Joi.string(),
      type: Joi.string()
        .valid('Equals', 'NotEquals', 'LessThan', 'LessThanOrEqualTo', 'GreaterThan', 'GreaterThanOrEqualTo'),
      object: Joi.alternatives(Joi.string(), Joi.number())
    }),
    Joi.object().keys({
      subject: Joi.string(),
      type: Joi.string().valid('Between'),
      lowerBound: Joi.alternatives(Joi.string(), Joi.number()),
      upperBound: Joi.alternatives(Joi.string(), Joi.number())
    }),
    Joi.object().keys({
      subject: Joi.string(),
      type: Joi.string().valid('Membership'),
      values: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number()))
    }),
    Joi.object().keys({
      subject: Joi.string(),
      type: Joi.string().valid('Function'),
      name: Joi.string().valid('attribute_exists', 'attribute_not_exists', 'attribute_type', 'begins_with', 'contains'),
      expected: Joi.string().optional()
    })
  );
  let conditionNot;
  const conditionAndOr = Joi.alternatives(
    Joi.object().keys({
      type: Joi.string().valid('Or', 'And'),
      conditions: Joi.array().items(Joi.lazy(() => Joi.alternatives(conditionSimple, conditionAndOr, conditionNot)))
    })
  );
  conditionNot = Joi.alternatives(
    Joi.object().keys({
      type: Joi.string().valid('Not'),
      condition: Joi.lazy(() => Joi.alternatives(conditionSimple, conditionAndOr, conditionNot))
    })
  );
  return Joi.alternatives(conditionSimple, conditionAndOr, conditionNot);
})();

const validate = (condition) => {
  try {
    Joi.attempt(condition, schema, `Invalid Condition Received:\n${condition}`);
  } catch (e) {
    throw new InvalidCondition(e);
  }
};
module.exports.validate = validate;

const evaluate = (condition, object) => ({
  Equals: () => object[condition.subject] === condition.object,
  NotEquals: () => object[condition.subject] !== condition.object,
  LessThan: () => object[condition.subject] < condition.object,
  LessThanOrEqualTo: () => object[condition.subject] <= condition.object,
  GreaterThan: () => object[condition.subject] > condition.object,
  GreaterThanOrEqualTo: () => object[condition.subject] >= condition.object,
  Between: () => condition.lowerBound <= object[condition.subject]
    && object[condition.subject] <= condition.upperBound,
  Membership: () => condition.values.includes(object[condition.subject]),
  Not: () => !evaluate(condition.condition, object),
  And: () => condition.conditions.map(cond => evaluate(cond, object)).every(e => e === true),
  Or: () => condition.conditions.map(cond => evaluate(cond, object)).some(e => e === true),
  Function: () => {
    throw new ConditionNotImplemented();
  }
})[condition.type]();
module.exports.evaluate = evaluate;

const extract = condition => ({
  Equals: () => [condition.subject],
  NotEquals: () => [condition.subject],
  LessThan: () => [condition.subject],
  LessThanOrEqualTo: () => [condition.subject],
  GreaterThan: () => [condition.subject],
  GreaterThanOrEqualTo: () => [condition.subject],
  Between: () => [condition.subject],
  Membership: () => [condition.subject],
  Not: () => extract(condition.condition),
  And: () => [...condition.conditions.map(cond => extract(cond))],
  Or: () => [...condition.conditions.map(cond => extract(cond))],
  Function: () => {
    throw new ConditionNotImplemented();
  }
})[condition.type]();
module.exports.extract = extract;
