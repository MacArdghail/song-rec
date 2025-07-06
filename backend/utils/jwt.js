const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET);
};

exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return { expired: true };
    }
    return null;
  }
};
