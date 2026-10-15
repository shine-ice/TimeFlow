import http from "http";
import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import { WsHub } from "./ws/hub";

const port = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

WsHub.init(server);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`WS  listening on ws://localhost:${port}/ws`);
});
