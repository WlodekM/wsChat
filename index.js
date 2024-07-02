import { WebSocketServer } from "ws";
import cuid from 'cuid';
import { getRandomInt } from "./lib.js"
import { commands } from "./commands.js";
import fs from 'fs';

const config = JSON.parse(String(fs.readFileSync("config.json")))

const channels = ["home", "off-topic"]

const ws = new WebSocketServer({
    port: 9933,
});

const users = {}

function sendInChannel(msg, channel) {
    for (const userID in users) {
        const user = users[userID];
        if (user.channel == channel) user.socket.send(msg)
    }
}

function format(txt) {
    txt = String(txt)
    txt = txt.replaceAll("$(serverName)$", config.name)
    txt = txt.replaceAll("$(userCount)$", Object.keys(users).length)
    txt = txt.replaceAll("$(max)$", config.max)
    return txt
}

ws.on('connection', (socket, request) => {
    if (config.max && Object.keys(users).length >= config.max) {
        socket.send(format(config.fullMessage ?? "Sorry, but the server is full right now, come back later"))
        socket.close(1001, "Server full")
    }
    let userID = cuid()
    socket.send(format(config.motd))
    let anonID = getRandomInt(0, 99999)
    users[userID] = {
        username: `Anonymous${"0".repeat(5 - anonID.length) + anonID.toString()}`,
        socket: socket,
        joinReq: request,
        t: {
            js: Number(new Date()),
            unix: Math.floor(new Date().getTime() / 1000),
            str: String(new Date())
        },
        channel: 'home'
    }
    sendInChannel(`${users[userID].username} joined #${users[userID].channel}!`, users[userID].channel)
    socket.on('close', function (code, reason) {
        sendInChannel(`${users[userID].username} left.`, users[userID].channel)
        delete users[userID]
    })
    socket.on('message', function (rawData) {
        if (rawData.toString().startsWith("/")) {
            let args = String(rawData).replace("/", "").split(" ");
            let command = args.shift();
            let commandObj = Object.values(commands).find(cmd => cmd.name == command || cmd.aliases.includes(command))
            console.log(`${users[userID].username} used /${command}`)
            if (!commandObj) return socket.send(`Error: Command "${command}" not found!`);
            let user = users[userID]
            try {
                commandObj.command({ user, command, args, sendInChannel, channels, users, commands })
            } catch (error) {
                user.socket.send(`Unexpected error ocurred while running the command`)
            }
            return
        }
        if (rawData.length < 1) return socket.send("Error: message too short!")
        if (rawData.length >= 2000) return socket.send("Error: message too long!")
        sendInChannel(`<${users[userID].username}> ${rawData}`, users[userID].channel)
        console.log(`(#${users[userID].channel}) <${users[userID].username}> ${rawData}`)
    })
})

ws.on('listening', () => {
    console.info("[INFO] Server started")
})
