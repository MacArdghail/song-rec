const express = require("express");
const router = express.Router();
const { verifyToken } = require("../utils/jwt");
const {
  sendRecommendation,
  getPlaylistRecommendations,
  getYourRecommendations,
  react,
} = require("../controllers/recommendation");

router.use(verifyToken);
router.post("/send", sendRecommendation);
router.get("/get", getPlaylistRecommendations);
router.get("/yours", getYourRecommendations);
router.post("/react", react);

module.exports = router;
