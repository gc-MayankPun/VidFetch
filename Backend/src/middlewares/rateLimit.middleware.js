import rateLimit from "express-rate-limit";

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    message: "Too many download requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default downloadLimiter;
