const express = require("express");
const router = express.Router();
const { verifyToken } = require("../utils/jwt");
const {
  getPlaylists,
  isOwner,
  isPlaylist,
  playlistDetails,
} = require("../controllers/playlist");

router.use(verifyToken);
router.get("/get_playlists", getPlaylists);
router.get("/playlist_details", playlistDetails);
router.get("/is_owner", isOwner);
router.get("/exists", isPlaylist);

module.exports = router;
