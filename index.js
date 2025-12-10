import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import userPostRoutes from "./routes/userPost.routes.js";
import communityPostRoutes from "./routes/communityPost.routes.js";
import communityRoutes from "./routes/community.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------
// CORS
// ------------------------
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://social-hub-seven.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));    // 👈 USE CORS OPTIONS

// ------------------------
// Middleware
// ------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Routes
// ------------------------
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", userPostRoutes);
app.use("/api/community/post", communityPostRoutes);
app.use("/api/communities", communityRoutes);

app.get("/", (_, res) => {
  res.send("API is Running...");
});

// ------------------------
// Start App Only When DB Ready
// ------------------------
async function startServer() {
  try {
    await connectDB();
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
