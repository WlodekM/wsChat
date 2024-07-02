import { WebSocketServer } from "ws";
import { getRandomInt } from "./lib.js"
import { commands } from "./commands.js";
import cuid from 'cuid';
import fs from 'fs';

const server = {
    config: JSON.parse(String(fs.readFileSync("config.json"))),
    channels: ["home", "off-topic"],
    users: {},
}

const ws = new WebSocketServer({
    port: 9933,
});

function sendInChannel(msg, channel) {
    for (const userID in server.users) {
        const user = server.users[userID];
        if (user.channel == channel) user.socket.send(msg)
    }
}

function format(txt) {
    txt = String(txt)
    txt = txt.replaceAll("$(serverName)$", server.config.name)
    txt = txt.replaceAll("$(userCount)$", Object.keys(server.users).length)
    txt = txt.replaceAll("$(max)$", server.config.max)
    return txt
}

ws.on('connection', (socket, request) => {
    if (server.config.max && Object.keys(server.users).length >= server.config.max) {
        socket.send(format(server.config.fullMessage ?? "Sorry, but the server is full right now, come back later"))
        socket.close(1001, "Server full")
    }
    let userID = cuid()
    socket.send(format(server.config.motd))
    let anonID = getRandomInt(0, 99999)
    server.users[userID] = {
        username: `Anonymous${"0".repeat(5 - anonID.toString().length) + anonID.toString()}`,
        socket: socket,
        joinReq: request,
        t: {
            js: Number(new Date()),
            unix: Math.floor(new Date().getTime() / 1000),
            str: String(new Date())
        },
        channel: 'home'
    }
    sendInChannel(`${server.users[userID].username} joined #${server.users[userID].channel}!`, server.users[userID].channel)
    socket.on('close', function (code, reason) {
        sendInChannel(`${server.users[userID].username} left.`, server.users[userID].channel)
        delete server.users[userID]
    })
    socket.on('message', function (rawData) {
        if (rawData.toString().startsWith("/")) {
            let args = String(rawData).replace("/", "").split(" ");
            let command = args.shift();
            let commandObj = Object.values(commands).find(cmd => cmd.name == command || cmd.aliases.includes(command))
            console.log(`${server.users[userID].username} used /${command}`)
            if (!commandObj) return socket.send(`Error: Command "${command}" not found!`);
            let user = server.users[userID]
            try {
                commandObj.command({ user, command, args, sendInChannel, server, commands })
            } catch (error) {
                user.socket.send(`Unexpected error ocurred while running the command`)
            }
            return
        }
        if (rawData.toString().startsWith(":client")) {
            let client = String(rawData).replace(":client", "");
            if (!client) return socket.send("Error: client info missing!");
            if (client.length < 2) return socket.send("Error: client info too short!");
            if (client.length >= 100) return socket.send("Error: client info too long!");
            server.users[userID].client = client;
            return
        }
        if (rawData.length < 1) return socket.send("Error: message too short!")
        if (rawData.length >= 2000) return socket.send("Error: message too long!")
        sendInChannel(`<${server.users[userID].username}> ${rawData}`, server.users[userID].channel)
        console.log(`(#${server.users[userID].channel}) <${server.users[userID].username}> ${rawData}`)
    })
})

ws.on('listening', () => {
    console.info("[INFO] Server started")
})
