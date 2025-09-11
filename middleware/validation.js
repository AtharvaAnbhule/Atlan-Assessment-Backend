import Joi from "joi";

export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);

    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    next();
  };
};

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid("user", "admin").default("user"),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createEventSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(2000),
  venue: Joi.string().min(3).max(255).required(),
  address: Joi.string().max(500),
  event_date: Joi.date().greater("now").required(),
  capacity: Joi.number().integer().min(1).max(100000).required(),
  price: Joi.number().precision(2).min(0).required(),
  category: Joi.string().max(100),
  image_url: Joi.string().uri().allow(""),
  status: Joi.string().valid("active", "draft", "cancelled").default("active"),
});

export const updateEventSchema = Joi.object({
  name: Joi.string().min(3).max(255),
  description: Joi.string().max(2000),
  venue: Joi.string().min(3).max(255),
  address: Joi.string().max(500),
  event_date: Joi.date().greater("now"),
  capacity: Joi.number().integer().min(1).max(100000),
  price: Joi.number().precision(2).min(0),
  category: Joi.string().max(100),
  image_url: Joi.string().uri().allow(""),
  status: Joi.string().valid("active", "draft", "cancelled", "completed"),
});

export const createBookingSchema = Joi.object({
  event_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
});

export const joinWaitlistSchema = Joi.object({
  event_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort_by: Joi.string().valid("event_date", "price", "capacity", "name"),
  sort_order: Joi.string().valid("asc", "desc").default("asc"),
});

export const eventFilterSchema = Joi.object({
  category: Joi.string().max(100),
  search: Joi.string().max(100),
  date_from: Joi.date(),
  date_to: Joi.date(),
  available_only: Joi.boolean(),
  status: Joi.string()
    .valid("active", "draft", "cancelled", "completed")
    .default("active"),
}).concat(paginationSchema);
