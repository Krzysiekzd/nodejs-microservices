const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  price: Joi.number().positive().required(),
  inStock: Joi.boolean().required(),
});

module.exports = { productSchema };
