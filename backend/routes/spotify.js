const express = require("express");
const router = express.Router();
const { verifyToken } = require("../utils/jwt");

const {
  createPlaylist,
  searchSong,
  recentlyPlayed,
} = require("../controllers/spotify");

router.use(verifyToken);
router.post("/create_playlist", createPlaylist);
router.get("/search", searchSong);
router.get("/recently_played", recentlyPlayed);

module.exports = router;
