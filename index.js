import { WebSocketServer } from "ws";
import { getRandomInt } from "./lib.js"
import { profanity } from '@2toad/profanity';
import { commands } from "./commands.js";
import * as accounts from "./accounts.js"
import cuid from 'cuid';
import fs from 'fs';
profanity.options.grawlixChar = "*"

const server = {
    config: JSON.parse(String(fs.readFileSync("config.json"))),
    channels: ["home", "off-topic"],
    users: {},
    accounts: accounts,
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

server.format = format

ws.on('connection', (socket, request) => {
    if (server.config.max && Object.keys(server.users).length >= server.config.max) {
        socket.send(format(server.config.fullMessage ?? "Sorry, but the server is full right now, come back later"))
        socket.close(1001, "Server full")
    }
    let userID = cuid()
    console.info(`${userID} joined the server.`)
    socket.send(format(server.config.motd))
    let anonID = getRandomInt(0, 99999)
    server.users[userID] = {
        username: `Anonymous${"0".repeat(5 - anonID.toString().length) + anonID.toString()}`,
        nickname: `Anonymous${"0".repeat(5 - anonID.toString().length) + anonID.toString()}`,
        guest: true,
        socket: socket,
        joinReq: request,
        t: {
            js: Number(new Date()),
            unix: Math.floor(new Date().getTime() / 1000),
            str: String(new Date())
        },
        channel: 'home',
        name: function(){return this.nickname != "" ? this.nickname : this.username}
    }
    const user = server.users[userID]
    console.info(`${user.name()} joined the server!`)
    sendInChannel(`${user.name()} joined #${server.users[userID].channel}!`, server.users[userID].channel)
    socket.on('close', function (code, reason) {
        sendInChannel(`${user.name()} left.`, server.users[userID].channel)
        delete server.users[userID]
    })
    socket.on('message', function (rawData) {
        if (rawData.toString().startsWith("/")) {
            let args = String(rawData).replace("/", "").split(" ");
            let command = args.shift();
            let commandObj = Object.values(commands).find(cmd => cmd.name == command || cmd.aliases.includes(command))
            console.log(`${user.name()} used /${command}`)
            if (!commandObj) return socket.send(`Error: Command "${command}" not found!`);
            try {
                commandObj.command({ user, command, args, sendInChannel, server, commands })
            } catch (error) {
                console.error(error)
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
        if (rawData.toString().startsWith(":jsonGet")) {
            let params = String(rawData).split(" ");
            params.shift()
            switch (params[0]) {
                case 'channels':
                    socket.send(JSON.stringify(server.channels));
                    break;
                case 'users':
                    socket.send(JSON.stringify(Object.values(server.users).map(usr => {return {
                        username: usr.username,
                        nickname: usr.nickname,
                        t: usr.t,
                        channel: user.channel,
                        displayName: user.name()
                    }})));
                    break;
                case 'usersLocal':
                    socket.send(
                        JSON.stringify(
                            Object.values(server.users)
                            .filter(usr => (usr.channel == user.channel))
                            .map(usr => {return {
                                username: usr.username,
                                nickname: usr.nickname,
                                t: usr.t,
                                channel: user.channel,
                                displayName: user.name()
                            }})
                        ));
                    break;
            
                default:
                    socket.send(`unknown "${params[0]}"`);
                    break;
            }
            return
        }
        if (rawData.length < 1) return socket.send("Error: message too short!");
        if (rawData.length >= 2000) return socket.send("Error: message too long!");
        if (!server.profanity) rawData = profanity.censor(String(rawData));
        sendInChannel(`<${user.name()}${user.guest ? " (guest)" : ""}> ${rawData}`, server.users[userID].channel)
        console.log(`(#${server.users[userID].channel}) <${user.name()}> ${rawData}`)
    })
})

ws.on('listening', () => {
    console.info("[INFO] Server started")
})
