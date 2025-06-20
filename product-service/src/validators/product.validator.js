const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  price: Joi.number().positive().required(),
  inStock: Joi.boolean().required(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  price: Joi.number().positive(),
  inStock: Joi.boolean(),
}).min(1);

module.exports = { productSchema, updateProductSchema };
