const express = require("express");
const router = express.Router();

const { spotifyLogin, spotifyCallback } = require("../controllers/auth");

router.get("/spotify_login", spotifyLogin);
router.get("/callback", spotifyCallback);

module.exports = router;
