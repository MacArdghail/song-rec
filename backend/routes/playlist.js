const express = require("express");
const router = express.Router();
const { verifyToken } = require("../utils/jwt");
const { getPlaylists, isOwner } = require("../controllers/playlist");

router.use(verifyToken);
router.get("/get_playlists", getPlaylists);
router.get("/is_owner", isOwner);

module.exports = router;
