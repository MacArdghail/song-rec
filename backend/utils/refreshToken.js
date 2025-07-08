const axios = require("axios");
const { mongoConnect } = require("../utils/mongo");

const refreshAccessToken = async (spotify_id, refresh_token) => {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const auth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

  const client = await mongoConnect();
  const db = client.db("songrec");
  const users = db.collection("spotify_users");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  await users.updateOne(
    { spotify_id },
    { $set: { access_token: response.data.access_token } },
  );

  return response.data.access_token;
};

module.exports = { refreshAccessToken };
