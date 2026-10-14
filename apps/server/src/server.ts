import http from "http";
import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";

const port = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`WS  listening on ws://localhost:${port}/ws`);
});
