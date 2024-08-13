import express, { type Express } from "express";
import morgan from "morgan";
import { createClient, type RedisClientType } from "redis";
import { setupWebSocketRoute } from "./websocket";

// initializeApp();

const app: Express = express();
const client: RedisClientType = createClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

app.get("/", (req, res) => {
    res.send(
        "Welcome to the Million Checkbox API: Please use /v1 appended to the URL"
    );
});

app.get("/v1", (req, res) => {
    res.send("Welcome to the Million Checkbox API");
});

app.get("/v1/health", (req, res) => {
    res.send("API is healthy");
});

app.use("/ws", setupWebSocketRoute(client));

async function startServer(): Promise<void> {
    try {
        await client.connect();
        console.log("Connected to Redis");

        app.listen(3001, () => {
            console.log("Server is running on port http://localhost:3001/");
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();
