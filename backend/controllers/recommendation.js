const { mongoConnect } = require("../utils/mongo");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { resend, sendEmail } = require("../utils/email");
const { refreshAccessToken } = require("../utils/refreshToken");

exports.sendRecommendation = async (req, res) => {
  const sender_spotify_id = req.user.spotify_id;
  const { playlist_id, track_id, message } = req.query;

  if (typeof message !== "string" || message.length > 140) {
    return res.status(400).json({ message: "Invalid message" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const playlists = db.collection("playlists");
    const users = db.collection("spotify_users");
    const recommendations = db.collection("recommendations");

    const playlist = await playlists.findOne({ playlist_id });
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const recipient = await users.findOne({ spotify_id: playlist.spotify_id });
    if (!recipient) {
      return res.status(404).json({ message: "Playlist owner not found" });
    }

    const sender = await users.findOne({ spotify_id: sender_spotify_id });
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    let accessToken = recipient.access_token;

    try {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
        { uris: [`spotify:track:${track_id}`] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.log("Access token may be expired. Refreshing...");
      accessToken = await refreshAccessToken(
        recipient.spotify_id,
        recipient.refresh_token,
      );

      try {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
          { uris: [`spotify:track:${track_id}`] },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (retryErr) {
        console.log("Spotify API error after retry:", retryErr);
        return res
          .status(500)
          .json({ message: "Failed to add track to playlist" });
      }
    }

    let trackResponse;

    try {
      trackResponse = await axios.get(
        `https://api.spotify.com/v1/tracks/${track_id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.error("Failed to fetch track details:", err);
      return res.status(500).json({ message: "Failed to fetch track details" });
    }

    console.log(trackResponse);

    await recommendations.insertOne({
      recommendation_id: uuidv4(),
      sender_spotify_id,
      recipient_spotify_id: recipient.spotify_id,
      playlist_id,
      track_id,
      message,
      track_name: trackResponse.data.name,
      track_img: trackResponse.data.album.images[0]?.url ?? "",
      artist_name: trackResponse.data.artists[0]?.name ?? "",
      sentAt: new Date(),
    });

    try {
      await sendEmail({
        to: recipient.email,
        subject: `${sender.display_name} sent you a song 🎶`,
        html: `
                <p>${sender.display_name} sent you song: <a href="https://open.spotify.com/track/${track_id}" target="_blank">Listen on Spotify</a></p>
                <p>With message: ${message}</p>
                <hr />
                <p style="font-size: 0.85em; color: #777;">This email was sent via song-rec.me</p>
            `,
      });
      console.log("Email sent successfully");
    } catch (err) {
      console.error("Failed to send email", err);
    }

    res.status(200).json({ message: "Recommendation sent successfully" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Failed to send recommendation" });
  }
};

exports.react = async (req, res) => {
  const recommendation_id = req.query.recommendation_id;
  const emoji = req.query.emoji;
  const senderId = req.user.spotify_id;

  const allowedEmojis = ["❤️", "👍", "👎"];

  if (!recommendation_id || !emoji) {
    return res
      .status(400)
      .json({ message: "Missing recommendation_id or emoji" });
  }

  if (!allowedEmojis.includes(emoji)) {
    return res.status(400).json({ message: "Invalid emoji" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");
    const recommendations = db.collection("recommendations");
    const users = db.collection("spotify_users");

    const recommendation = await recommendations.findOne({ recommendation_id });

    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    const recipient = await users.findOne({
      spotify_id: recommendation.sender_spotify_id,
    });

    const sender = await users.findOne({ spotify_id: senderId });

    await recommendations.updateOne({ recommendation_id }, { $set: { emoji } });

    try {
      await sendEmail({
        to: recipient.email,
        subject: `${sender.display_name} reacted to your recommendation`,
        html: `
                <p>${sender.display_name} reacted to your recommendation with: ${emoji}</p>
                <hr />
                <p style="font-size: 0.85em; color: #777;">This email was sent via song-rec.me</p>
            `,
      });
      console.log("Email sent successfully");
    } catch (err) {
      console.error("Failed to send email", err);
    }

    res.status(200).json({ message: "Reaction sent successfully" });
  } catch (err) {
    console.error("Error in reacting", err);
    res.status(500).json({ message: "Failed to react" });
  }
};

exports.getYourRecommendations = async (req, res) => {
  const spotify_id = req.user.spotify_id;

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const recommendations = await db
      .collection("recommendations")
      .find({ sender_spotify_id: spotify_id })
      .toArray();

    const user = await db.collection("spotify_users").findOne({ spotify_id });

    let recs;

    try {
      recs = await Promise.all(
        recommendations.map(async (rec) => {
          const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${rec.playlist_id}`,
            {
              headers: {
                Authorization: `Bearer ${user.access_token}`,
                "Content-Type": "application/json",
              },
            },
          );
          return {
            playlist_name: response.data.name,
            owner_name: response.data.owner?.display_name || "Unknown",
            ...rec,
          };
        }),
      );
    } catch (err) {
      console.log("Access token may be expired. Refreshing...");
      if (!user.refresh_token) {
        return res.status(401).json({ message: "Refresh token missing" });
      }

      const accessToken = await refreshAccessToken(
        spotify_id,
        user.refresh_token,
      );

      try {
        recs = await Promise.all(
          recommendations.map(async (rec) => {
            const response = await axios.get(
              `https://api.spotify.com/v1/playlists/${rec.playlist_id}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              },
            );
            return {
              playlist_name: response.data.name,
              owner_name: response.data.owner?.display_name || "Unknown",
              ...rec,
            };
          }),
        );
      } catch (retryErr) {
        console.log("Spotify API error after retry:", retryErr);
        return res
          .status(500)
          .json({ message: "Failed to fetch playlist info after retry" });
      }
    }

    return res.status(200).json(recs);
  } catch (err) {
    console.error("Error in getYourRecommendations", err);
    res.status(500).json({ message: "Failed to retrieve recommendations" });
  }
};

exports.getPlaylistRecommendations = async (req, res) => {
  const playlist_id = req.query.playlist_id;
  const spotify_id = req.user.spotify_id;

  if (!playlist_id) {
    return res.status(400).json({ message: "Missing playlist_id" });
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.log("Access token may be expired. Refreshing...");
      if (!user.refresh_token) {
        return res.status(401).json({ message: "Refresh token missing" });
      }
      accessToken = await refreshAccessToken(spotify_id, user.refresh_token);

      try {
        response = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlist_id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
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

    const totalRecommendations = recommendations.length;

    const uniqueRecommenders = new Set(
      recommendations.map((rec) => rec.sender_spotify_id),
    ).size;

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

    res.status(200).json({
      recommendations: recs,
      playlist_info,
      stats: {
        total_recommendations: totalRecommendations,
        unique_recommenders: uniqueRecommenders,
      },
    });
  } catch (err) {
    console.error("Error in getPlaylistRecommendations: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
