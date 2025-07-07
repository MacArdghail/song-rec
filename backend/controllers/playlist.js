const { mongoConnect } = require("../utils/mongo");
const axios = require("axios");

exports.getPlaylists = async (req, res, next) => {
  try {
    const spotify_id = req.user.spotify_id;

    const client = await mongoConnect();
    const db = client.db("songrec");

    const playlists = await db
      .collection("playlists")
      .find({ spotify_id })
      .toArray();

    res.json(playlists);
  } catch (err) {
    next(err);
  }
};

exports.isOwner = async (req, res, next) => {
  try {
    const spotify_id = req.user.spotify_id;
    const playlist_id = req.query.playlist_id;

    if (!playlist_id) {
      return res.status(400).json({ error: "Missing playlist or spotify id" });
    }

    const client = await mongoConnect();
    const db = client.db("songrec");
    const playlists = db.collection("playlists");

    const playlist = await playlists.findOne({ playlist_id });

    if (!playlist) {
      return res.status(404).json({ isOwner: false });
    }

    const isOwner = playlist.spotify_id === spotify_id;

    res.status(200).json({ isOwner });
  } catch (err) {
    console.log("Error in /is_owner", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
