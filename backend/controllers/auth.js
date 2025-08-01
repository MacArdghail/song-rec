const axios = require("axios");
const querystring = require("querystring");
const { signToken } = require("../utils/jwt");
const { mongoConnect } = require("../utils/mongo");

exports.spotifyLogin = (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-recently-played",
  ];
  const state = req.query.state || "";

  const authUrl =
    `https://accounts.spotify.com/authorize?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `scope=${encodeURIComponent(scopes.join(" "))}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
};

exports.spotifyCallback = async (req, res, next) => {
  const code = req.query.code;
  const state = req.query.state;

  if (!code) {
    return res.status(400).json({ error: "Authorization Code missing" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
                ":" +
                process.env.SPOTIFY_CLIENT_SECRET,
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token, refresh_token } = tokenResponse.data;

    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const {
      id: spotify_id,
      email,
      display_name,
      images,
    } = profileResponse.data;

    const profile_img = images.length > 0 ? images[0].url : null;

    const client = await mongoConnect();
    const db = client.db("songrec");
    await db.collection("spotify_users").updateOne(
      { spotify_id },
      {
        $setOnInsert: {
          spotify_id,
          email,
          access_token,
          refresh_token,
          display_name,
          profile_img,
        },
      },
      { upsert: true },
    );

    const token = signToken({ spotify_id });

    res.cookie("token", token, {
      httpOnly: true,
      // maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      // secure: true,
      // sameSite: "None",
      // domain: "song-rec.me",
      // path: "/",
    });

    if (state) {
      return res.redirect(`http://localhost:4200/${state}`);
    }
    return res.redirect("http://localhost:4200/me");
  } catch (err) {
    if (err.response) {
      if (err.response.status === 403) {
        console.error(
          "User has denied required permissions:",
          err.response.data,
        );
        return res.redirect("http://localhost:4200/spotify-403");
      }
      console.error("Spotify token error:", err.response.data);
      return res.redirect("http://localhost:4200/spotify-403");
    } else {
      console.error("Unexpected error:", err.message);
      return res.redirect("https://song-rec.me/spotify-403");
    }
    next(err);
  }
};
