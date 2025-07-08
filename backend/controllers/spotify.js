const { mongoConnect } = require("../utils/mongo");
const axios = require("axios");

exports.createPlaylist = async (req, res, next) => {
  try {
    const spotify_id = req.user.spotify_id;
    let { name, description } = req.body;

    // Set defaults if missing
    name = name || "Untitled Playlist";
    description = description || "";

    // Validate inputs
    if (
      typeof name !== "string" ||
      name.length > 50 ||
      typeof description !== "string" ||
      description.length > 200
    ) {
      return res
        .status(400)
        .json({ message: "Invalid playlist name or description" });
    }

    const client = await mongoConnect();
    const db = client.db("songrec");

    const users = db.collection("spotify_users");
    const user = await users.findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const playlistData = {
      name,
      description,
    };

    let token = user.access_token;

    let response;
    try {
      response = await axios.post(
        `https://api.spotify.com/v1/users/${spotify_id}/playlists`,
        playlistData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.error("Spotify API error:", err.response?.data || err.message);
      return res
        .status(500)
        .json({ message: "Failed to create playlist on Spotify" });
    }

    if (!response || !response.data || !response.data.id) {
      return res.status(500).json({ message: "Unexpected Spotify response" });
    }

    const { id: playlist_id } = response.data;

    const newPlaylist = {
      playlist_id,
      spotify_id,
      created_at: new Date(),
    };

    const result = await db.collection("playlists").insertOne(newPlaylist);
    res.status(201).json({ message: "playlist created successfully" });
  } catch (err) {
    next(err);
  }
};

exports.recentlyPlayed = async (req, res, next) => {
  const spotify_id = req.user.spotify_id;
  let client;

  try {
    client = await mongoConnect();
    const db = client.db("songrec");

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const accessToken = user.access_token;

    try {
      const recentlyPlayedResponse = await axios.get(
        "https://api.spotify.com/v1/me/player/recently-played",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 50,
          },
        },
      );

      const items = recentlyPlayedResponse.data.items;

      const trackMap = new Map();

      for (const item of items) {
        const track = item.track;
        const trackId = track.id;

        if (!trackMap.has(trackId)) {
          trackMap.set(trackId, { track, count: 1 });
        } else {
          trackMap.get(trackId).count += 1;
        }
      }

      const sortedTracks = Array.from(trackMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      //   console.log(trackMap);

      return res.json(sortedTracks);
    } catch (err) {
      console.error("Spotify API error:", err.response?.data || err.message);
      return res
        .status(401)
        .json({ message: "Spotify token may be expired or invalid" });
    }
  } catch (err) {
    console.error("Server error during recently played:", err);
    return res
      .status(500)
      .json({ message: "Server error during recently played" });
  }
};

exports.searchSong = async (req, res, next) => {
  const spotify_id = req.user.spotify_id;
  const search_query = req.query.q;

  if (!search_query) {
    return res.status(400).json({ message: "Missing search query" });
  }

  let client;

  try {
    client = await mongoConnect();
    const db = client.db("songrec");

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const accessToken = user.access_token;

    try {
      const searchResponse = await axios.get(
        "https://api.spotify.com/v1/search",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            q: search_query,
            type: "track",
            limit: 10,
          },
        },
      );

      return res.json(searchResponse.data);
    } catch (err) {
      console.error("Spotify token error:", err.response?.data || err.message);
      return res
        .status(401)
        .json({ message: "Spotify access token expired or invalid" });
    }
  } catch (err) {
    console.error("Server error during song search:", err);
    return res.status(500).json({ message: "Server error during search" });
  }
};
