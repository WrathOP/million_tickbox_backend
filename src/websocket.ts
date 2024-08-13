import express from "express";
import type { RedisClientType } from "redis";
import { WebSocketServer } from "ws";
import cron from "node-cron";

export const websocketRoute = express.Router();

interface Message {
    key: string;
    offset: number;
    bitValue: 0 | 1;
}

export function setupWebSocketRoute(client: RedisClientType) {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", async (ws) => {
        console.log("Client connected to WebSocket");

        try {
            const rawData: string = await client.GETRANGE(
                "million-checkbox",
                0,
                999999
            );
            const buffer = Buffer.from(rawData, "binary");

            // console.log(buffer);

            ws.send(buffer, {
                binary: true,
            });
        } catch (error) {
            console.error("Error fetching bitmap from Redis:", error);
        }

        ws.on("message", async (data: string): Promise<void> => {
            try {
                // TODO: Make an encoding logic for websocket so that we don't have to deal in JSON
                const message: Message = JSON.parse(data);

                console.log("Received message:", message);

                await client.SETBIT(
                    message.key,
                    message.offset,
                    message.bitValue
                );

                // Broadcast to all connected clients, including the sender
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(message));
                    }
                });
            } catch (error) {
                console.error("Error processing message:", error);
                ws.send(
                    "Error processing your message. Ensure it is a valid JSON with key, offset, and bitValue."
                );
            }
        });

        const stateScheduler = cron.schedule("*/5 * * * * *", async () => {
            try {
                const rawData: string = await client.GETRANGE(
                    "million-checkbox",
                    0,
                    999999
                );

                const buffer = Buffer.from(rawData, "binary");
                // console.log(buffer[0]);

                ws.send(buffer, { binary: true });

            } catch (error) {
                console.error("Error sending state from Redis:", error);
            }
        });

        // At regular intervals send the entire redis state to all of the clients
        // if (wss.clients.size > 0) {
        //     setInterval(async () => {
        //         try {
        //             const rawData: string = await client.GETRANGE("million-checkbox", 0, 1000000);
        //             const buffer = Buffer.from(rawData,"binary");

        //             wss.clients.forEach((client) => {
        //                 if (client.readyState === WebSocket.OPEN) {
        //                     client.send(buffer, {
        //                         binary: true,
        //                     });
        //                 }
        //             });
        //         } catch (error) {
        //             console.error("Error fetching bitmap from Redis:", error);
        //         }
        //     }, 5000);
        // }

        ws.on("close", () => {
            console.log("Client disconnected");
            stateScheduler.stop();
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
            stateScheduler.stop();
        });
    });

    websocketRoute.use("/", (req, res, next) => {
        wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    return websocketRoute;
}
