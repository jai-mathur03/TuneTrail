// -------------------- IMPORTS --------------------
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const connectDB = require("./db/config");
require("dotenv").config();

// -------------------- MODELS --------------------
const Admin = require("./db/Admin/admin");
const songs = require("./db/Admin/Addsong");
const users = require("./db/User/user");
const WishlistItem = require("./db/User/Wishlist");
const PlaylistItem = require("./db/User/Playlist");

// -------------------- APP INIT --------------------
const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(
  cors({
    credentials: true,
  })
);

// -------------------- FILE UPLOAD SETUP --------------------
const storage = multer.diskStorage({
  destination: "uploads",
  filename: function (req, file, callback) {
    callback(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

// -------------------- ADMIN ROUTES --------------------

// Admin Login
app.post("/alogin", (req, res) => {
  const { email, password } = req.body;
  Admin.findOne({ email: email })
    .then((user) => {
      if (user) {
        if (user.password === password) {
          return res.json({
            Status: "Success",
            user: { id: user.id, name: user.name, email: user.email },
          });
        } else {
          res.json("login fail");
        }
      } else {
        res.json("no user");
      }
    })
    .catch(() => res.status(500).send("Server Error"));
});

// Admin Signup
app.post("/asignup", (req, res) => {
  const { name, email, password } = req.body;
  Admin.findOne({ email })
    .then((existing) => {
      if (existing) return res.json("Already have an account");
      Admin.create({ name, email, password })
        .then(() => res.json("Account Created"))
        .catch(() => res.status(500).send("Failed"));
    })
    .catch(() => res.status(500).send("Server Error"));
});

// Fetch all users
app.get("/users", (req, res) => {
  users
    .find()
    .then((user) => res.status(200).json(user))
    .catch(() => res.sendStatus(500));
});

// Delete a user
app.delete("/userdelete/:id", (req, res) => {
  users
    .findByIdAndDelete(req.params.id)
    .then(() => res.sendStatus(200))
    .catch(() => res.status(500).json({ error: "Internal server error" }));
});

// -------------------- SONG ROUTES --------------------

// Add Song
app.post("/addsong", upload.single("songUrl"), (req, res) => {
  const { title, genre, singer, image } = req.body;
  const songUrl = req.file ? req.file.path : undefined;

  const song = new songs({ songUrl, title, genre, singer, image });
  song
    .save()
    .then((saved) => res.status(201).json(saved))
    .catch(() => res.status(400).json({ error: "Failed to create song" }));
});

// Fetch all songs
app.get("/songs", (req, res) => {
  songs
    .find()
    .then((song) => res.status(200).json(song))
    .catch(() => res.status(400).json({ error: "Failed to fetch songs" }));
});

// Delete song
app.delete("/deletesong/:id", (req, res) => {
  songs
    .findByIdAndDelete(req.params.id)
    .then(() => res.sendStatus(200))
    .catch(() => res.status(500).json({ error: "Internal server error" }));
});

// -------------------- USER ROUTES --------------------

// User Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  users
    .findOne({ email })
    .then((user) => {
      if (!user) return res.json("User not found");
      if (user.password === password)
        return res.json({
          Status: "Success",
          user: { id: user.id, name: user.name, email: user.email },
        });
      res.json("Invalid Password");
    })
    .catch(() => res.status(500).send("Server Error"));
});

// User Signup
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  users
    .findOne({ email })
    .then((existing) => {
      if (existing) return res.json("Already have an account");
      users
        .create({ name, email, password })
        .then(() => res.json("Account Created"))
        .catch(() => res.status(500).send("Failed"));
    })
    .catch(() => res.status(500).send("Server Error"));
});

// -------------------- WISHLIST ROUTES --------------------
app.get("/wishlist", async (req, res) => {
  try {
    const wishlist = await WishlistItem.find();
    res.json(wishlist);
  } catch {
    res.status(500).send("Server Error");
  }
});

app.post("/wishlist/add", async (req, res) => {
  const { itemId, title, image, userId, userName, genre, songUrl, singer } =
    req.body;
  try {
    const existing = await WishlistItem.findOne({ itemId });
    if (existing) return res.status(400).json({ msg: "Item already in wishlist" });
    const newItem = new WishlistItem({
      itemId,
      title,
      userId,
      userName,
      genre,
      songUrl,
      image,
      singer,
    });
    await newItem.save();
    res.json(newItem);
  } catch {
    res.status(500).send("Server Error");
  }
});

app.post("/wishlist/remove", async (req, res) => {
  try {
    await WishlistItem.findOneAndDelete({ itemId: req.body.itemId });
    res.json({ msg: "Item removed from wishlist" });
  } catch {
    res.status(500).send("Server Error");
  }
});

// -------------------- PLAYLIST ROUTES --------------------
app.get("/playlist", async (req, res) => {
  try {
    const playlist = await PlaylistItem.find();
    res.json(playlist);
  } catch {
    res.status(500).send("Server Error");
  }
});

app.post("/playlist/add", async (req, res) => {
  const { itemId, title, image, userId, userName, genre, songUrl, singer } =
    req.body;
  try {
    const existing = await PlaylistItem.findOne({ itemId });
    if (existing) return res.status(400).json({ msg: "Song already in playlist" });
    const newItem = new PlaylistItem({
      itemId,
      title,
      userId,
      userName,
      genre,
      songUrl,
      image,
      singer,
    });
    await newItem.save();
    res.json(newItem);
  } catch {
    res.status(500).send("Server Error");
  }
});

app.post("/playlist/remove", async (req, res) => {
  try {
    await PlaylistItem.findOneAndDelete({ itemId: req.body.itemId });
    res.json({ msg: "Item removed from playlist" });
  } catch {
    res.status(500).send("Server Error");
  }
});

// -------------------- SERVE FRONTEND (RENDER DEPLOYMENT) --------------------
const frontendPath = path.resolve(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 7000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
