require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const spotifyRoutes = require("./routes/spotify");
const playlistRoutes = require("./routes/playlist");
const recommendationRoutes = require("./routes/recommendation");
const app = express();

const allowedOrigins = ["http://localhost:4200", "https://song-rec.me"];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 250 }));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/", authRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/playlist", playlistRoutes);
app.use("/recommendation", recommendationRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
