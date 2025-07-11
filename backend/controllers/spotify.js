const { mongoConnect } = require("../utils/mongo");
const axios = require("axios");
const { refreshAccessToken } = require("../utils/refreshToken");

exports.createPlaylist = async (req, res, next) => {
  try {
    const spotify_id = req.user.spotify_id;
    let { name, description } = req.body;

    name = name || "send my recommendations ✌️";
    description = description || "";

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

    const playlistData = { name, description };
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
      console.log("Token might be expired, refreshing...");
      token = await refreshAccessToken(spotify_id, user.refresh_token);
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
      } catch (retryErr) {
        console.log("Spotify API error after retry:", retryErr);
        return res.status(500).json({ message: "Failed to create playlist" });
      }
    }

    if (!response || !response.data || !response.data.id) {
      return res.status(500).json({ message: "Unexpected Spotify response" });
    }

    const { id: playlist_id } = response.data;

    try {
      await axios.put(
        `https://api.spotify.com/v1/playlists/${playlist_id}`,
        { description: `https://song-rec.me/${playlist_id}` },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (retryErr) {
      console.log("Spotify API error after retry:", retryErr);
      return res.status(500).json({ message: "Failed to create playlist" });
    }

    const newPlaylist = {
      playlist_id,
      spotify_id,
      created_at: new Date(),
    };

    await db.collection("playlists").insertOne(newPlaylist);
    res.status(201).json({ playlist_id });
  } catch (err) {
    next(err);
  }
};

exports.recentlyPlayed = async (req, res, next) => {
  const spotify_id = req.user.spotify_id;

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let accessToken = user.access_token;
    let recentlyPlayedResponse;

    try {
      recentlyPlayedResponse = await axios.get(
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
    } catch (err) {
      console.warn("Access token may be expired, refreshing...");

      const newToken = await refreshAccessToken(spotify_id, user.refresh_token);
      accessToken = newToken;

      try {
        recentlyPlayedResponse = await axios.get(
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
      } catch (retryErr) {
        console.error(
          "Spotify API error after retry:",
          retryErr.response?.data || retryErr.message,
        );
        return res
          .status(401)
          .json({ message: "Failed to fetch recently played from Spotify" });
      }
    }

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

    return res.json(sortedTracks);
  } catch (err) {
    console.error("Server error during recently played:", err);
    return res
      .status(500)
      .json({ message: "Server error during recently played" });
  }
};

exports.me = async (req, res) => {
  const spotify_id = req.user.spotify_id;
  try {
    const client = await mongoConnect();
    const db = client.db("songrec");
    const user = await db.collection("spotify_users").findOne({ spotify_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      profile_img:
        user?.profile_img ||
        "https://cdna.artstation.com/p/assets/images/images/084/124/296/large/matthew-blank-profile-photo-1.jpg?1737590038",
    });
  } catch (err) {
    console.error("Spotify API error after retry:", err);
    return res.status(401).json({ message: "Failed to get me" });
  }
};
exports.searchSong = async (req, res, next) => {
  const spotify_id = req.user.spotify_id;
  const search_query = req.query.q;

  if (!search_query) {
    return res.status(400).json({ message: "Missing search query" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let accessToken = user.access_token;
    let searchResponse;

    try {
      searchResponse = await axios.get("https://api.spotify.com/v1/search", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          q: search_query,
          type: "track",
          limit: 10,
        },
      });

      return res.json(searchResponse.data);
    } catch (err) {
      console.warn("Access token may be expired, refreshing...");

      const newToken = await refreshAccessToken(spotify_id, user.refresh_token);
      accessToken = newToken;

      try {
        searchResponse = await axios.get("https://api.spotify.com/v1/search", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            q: search_query,
            type: "track",
            limit: 10,
          },
        });

        return res.json(searchResponse.data);
      } catch (retryErr) {
        console.error(
          "Spotify API error after retry:",
          retryErr.response?.data || retryErr.message,
        );
        return res.status(401).json({ message: "Failed to search songs" });
      }
    }
  } catch (err) {
    console.error("Server error during song search:", err);
    return res.status(500).json({ message: "Server error during search" });
  }
};
