import express from "express";
import { generate } from "./chatbot.js";
import cors from "cors";

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());
app.use(express.static("frontend"));

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

app.post("/chat", async (req, res) => {
  const { message, threadId } = req.body;
  if (!message || !threadId) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const result = await generate(message, threadId);
  res.json({ message: result });
});

app.listen(port, () => {
  // console.log(`Server is running on port ${port}`);
});
