const { mongoConnect } = require("../utils/mongo");
const axios = require("axios");
const { refreshAccessToken } = require("../utils/refreshToken");

exports.isPlaylist = async (req, res) => {
  try {
    const playlist_id = req.query.playlist_id;

    if (!playlist_id) {
      return res.status(404).json({ message: "playlist_id is required" });
    }

    const client = await mongoConnect();
    const db = client.db("songrec");

    const playlists = db.collection("playlists");

    const playlist = await playlists.findOne({ playlist_id });

    if (playlist) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (err) {
    console.error("Error checking playlist:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPlaylists = async (req, res, next) => {
  try {
    const spotify_id = req.user.spotify_id;

    const client = await mongoConnect();
    const db = client.db("songrec");

    let playlistsWithDetails;
    const playlists = await db
      .collection("playlists")
      .find({ spotify_id })
      .toArray();

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user || !user.access_token) {
      return res.status(401).json({ error: "Spotify access token missing." });
    }

    playlistsWithDetails = await Promise.all(
      playlists.map(async (p) => {
        try {
          const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${p.playlist_id}`,
            {
              headers: {
                Authorization: `Bearer ${user.access_token}`,
              },
            },
          );

          return {
            id: p.playlist_id,
            name: response.data.name,
            image_url: response.data.images?.[0]?.url ?? null,
          };
        } catch (error) {
          console.log("error fetching playlist details, refreshing token ... ");
          accessToken = await refreshAccessToken(
            spotify_id,
            user.refresh_token,
          );
          playlistsWithDetails = await Promise.all(
            playlists.map(async (p) => {
              try {
                const response = await axios.get(
                  `https://api.spotify.com/v1/playlists/${p.playlist_id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  },
                );

                return {
                  id: p.playlist_id,
                  name: response.data.name,
                  image_url: response.data.images?.[0]?.url ?? null,
                };
              } catch (error) {
                console.error(
                  `Error fetching playlist ${p.playlist_id}:`,
                  error.message,
                );
                return {
                  id: p.playlist_id,
                  name: "Unknown Playlist",
                  image_url: null,
                  error: true,
                };
              }
            }),
          );
        }
      }),
    );
    res.json(playlistsWithDetails);
  } catch (err) {
    next(err);
  }
};

exports.getPlaylistRecommendations = async (req, res) => {
  const playlist_id = req.query.playlist_id;
  const spotify_id = req.user.spotify_id;

  if (!playlist_id) {
    return res.status(400).json({ message: "Missing playlistId" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let accessToken = user.access_token;
    let response;

    try {
      response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    } catch (err) {
      console.log("Access token may be expired. Refreshing...");
      accessToken = await refreshAccessToken(spotify_id, user.refresh_token);

      try {
        response = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlist_id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
      } catch (retryErr) {
        console.log("Spotify API error after retry:", retryErr);
        return res
          .status(500)
          .json({ message: "Failed to fetch playlist info" });
      }
    }

    const playlist_info = {
      name: response.data.name || "Error finding playlist name",
      image_url:
        response.data.images?.[0]?.url ??
        "https://community.spotify.com/t5/image/serverpage/image-id/25294i2836BD1C1A31BDF2?v=v2",
    };

    const recommendations = await db
      .collection("recommendations")
      .find({ playlist_id })
      .toArray();

    const recs = await Promise.all(
      recommendations.map(async (rec) => {
        const user = await db
          .collection("spotify_users")
          .findOne({ spotify_id: rec.sender_spotify_id });
        return {
          ...rec,
          display_name: user?.display_name,
          profile_img:
            user?.profile_img ??
            "https://cdna.artstation.com/p/assets/images/images/084/124/296/large/matthew-blank-profile-photo-1.jpg?1737590038",
        };
      }),
    );

    const totalRecommendations = recommendations.length;
    const uniqueRecommenders = new Set(
      recommendations.map((r) => r.sender_spotify_id),
    ).size;

    res.status(200).json({
      recs,
      playlist_info,
      stats: {
        total_recommendations: totalRecommendations,
        unique_recommenders: uniqueRecommenders,
      },
    });
  } catch (err) {
    console.error("Error in getPlaylistRecommendations:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.isOwner = async (req, res) => {
  const spotify_id = req.user.spotify_id; // from the JWT verified user
  const playlist_id = req.query.playlist_id;

  if (!playlist_id) {
    return res.status(400).json({ message: "playlist_id is required" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");
    const playlists = db.collection("playlists");

    const playlist = await playlists.findOne({ playlist_id });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.spotify_id === spotify_id;

    res.status(200).json({ isOwner });
  } catch (err) {
    console.error("Error in isOwner:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.playlistDetails = async (req, res) => {
  const playlist_id = req.query.playlist_id;
  const spotify_id = req.user.spotify_id; // current user making the request

  if (!playlist_id) {
    return res.status(400).json({ message: "Missing playlist_id" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    // Find playlist in your DB to get owner spotify_id
    const playlist = await db.collection("playlists").findOne({ playlist_id });
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Get owner info from spotify_users collection
    const owner = await db
      .collection("spotify_users")
      .findOne({ spotify_id: playlist.spotify_id });

    if (!owner) {
      return res.status(404).json({ message: "Playlist owner not found" });
    }

    // Get current user to obtain access token for Spotify API call
    const user = await db.collection("spotify_users").findOne({ spotify_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let accessToken = user.access_token;

    let response;
    try {
      // Fetch playlist name from Spotify API
      response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    } catch (err) {
      // Token might be expired, try refresh
      accessToken = await refreshAccessToken(spotify_id, user.refresh_token);

      response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    }

    const playlist_name = response.data.name;

    res.status(200).json({
      owner_name: owner.display_name,
      owner_profile_img: owner.profile_img,
      playlist_name,
    });
  } catch (err) {
    console.error("Error in playlistDetails:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
