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

    try {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
        { uris: [`spotify:track:${track_id}`] },
        {
          headers: {
            Authorization: `Bearer ${recipient.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      console.log("Access token may be expired. Refreshing...");
      const accessToken = await refreshAccessToken(
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

    await recommendations.insertOne({
      recommendation_id: uuidv4(),
      sender_spotify_id,
      recipient_spotify_id: recipient.spotify_id,
      playlist_id,
      track_id,
      message,
      sentAt: new Date(),
    });

    try {
      await sendEmail({
        to: recipient.email,
        subject: `${sender.display_name} sent you a song 🎶`,
        html: `
                <p>${sender.display_name} sent you song: ${track_id}</p>
                <p>With message: ${message}</p>
                <p><a href="https://open.spotify.com/track/${track_id}" target="_blank">Listen on Spotify</a></p>
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

    res.status(200).json(recommendations);
  } catch (err) {
    console.error("Error in getYourRecommendations", err);
    res.status(500).json({ message: "Failed to retrieve recommendations" });
  }
};

exports.getPlaylistRecommendations = async (req, res) => {
  const playlist_id = req.query.playlist_id;

  if (!playlist_id) {
    return res.status(400).json({ message: "missing playlistId" });
  }

  try {
    const client = await mongoConnect();
    const db = client.db("songrec");

    const recommendations = await db
      .collection("recommendations")
      .find({ playlist_id })
      .toArray();
    res.status(200).json({ recommendations });
  } catch (err) {
    console.error("Error in getPlaylist: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
