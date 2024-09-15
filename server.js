import { WebSocketServer } from "ws";
import { profanity } from "@2toad/profanity";
import { commands } from "./commands.js";
import * as accounts from "./accounts.js";
import fs from "fs";
import User from "./user.js";
import handleJsonMessage from './jsondata.js'

export default class Server {
    sendInChannel(msg, channel, server=this) {
        // console.log('this is a', this)
        for (const userID in server.users) {
            const user = server.users[userID];
            if (user.channel == channel) user.socket.send(msg);
        }
    }
    
    format(txt) {
        txt = String(txt);
        txt = txt.replaceAll("$(serverName)$", this.config.name);
        txt = txt.replaceAll("$(userCount)$", Object.keys(this.users).length);
        for (const configName in this.config) {
            if (Object.prototype.hasOwnProperty.call(this.config, configName)) {
                const configValue = this.config[configName];
                if(typeof configValue != 'string' && typeof configValue != 'number') continue;
                txt = txt.replaceAll(`$(${configName})$`, configValue);
            }
        }
        return txt;
    }
    
    updateUsers() {
        Object.keys(this.users).forEach((user) => {
            if (user.subscribedToUsers) {
                user.socket.send(
                    `:json.sub<users>:${JSON.stringify(
                        Object.values(this.users).map((usr) => {
                            return {
                                username: usr.username,
                                nickname: usr.nickname,
                                t: usr.t,
                                channel: user.channel,
                                displayName: user.name(),
                            };
                        })
                    )}`
                );
            }
        });
    }

    /**
     * A wsChat server
     * @param {{
     *  name: String,
     *  motd: String,
     *  max: Number,
     *  owner: String,
     *  saveIP: Boolean,
     *  requireLogin: Boolean,
     *  profanity: Boolean,
     *  profanityRemoveWords: String[],
     *  profanityAddWords: String[],
     *  fullMessage: String,
     *  annonFormat: String,
     *  port: Number,
     *  channels: String[],
     *  annonChannels: String[]
     * }} config
     */
    constructor (config) {
        this.config = config;
        this.channels = this.config.channels;
        this.annonChannels = this.config.annonChannels;
        this.users = []
        this.accounts = accounts;
        this.ws = new WebSocketServer({
            port: this.config.port,
        });

        if (this.config.profanityRemoveWords) profanity.removeWords(this.config.profanityRemoveWords);
        if (this.config.profanityAddWords) profanity.addWords(this.config.profanityAddWords);

        let server = this

        this.ws.on("connection", (socket, request) => {
            try {
                if (server.config.max && Object.keys(server.users).length >= server.config.max) {
                    socket.send(server.format(server.config.fullMessage ?? "Sorry, but the server is full right now, come back later"));
                    socket.close(1001, "Server full");
                    return;
                }
                const user = new User(request, socket, server)
                server.users[user.id] = user
                let ipBanList = JSON.parse(String(fs.readFileSync("db/bannedIps.json")));
                if (ipBanList[user.ip]) {
                    socket.send("Your IP is banned for " + ipBanList[user.ip]);
                    socket.close(1002, "Banned");
                    return;
                }
                socket.send(server.format(server.config.motd));
                console.info(`${user.name()}[${user.id}] joined the server!`);
                server.sendInChannel(`${user.name()} joined.`, server.users[user.id].channel);
                server.updateUsers();
                socket.on("close", function (code, reason) {
                    server.sendInChannel(`${user.name()} left.`, server.users[user.id].channel);
                    server.updateUsers();
                    delete server.users[user.id];
                });
                socket.on("message", function (rawData) {
                    if (rawData.toString().startsWith("/")) {
                        let args = String(rawData).replace("/", "").split(" ");
                        let command = args.shift();
                        let commandObj = Object.values(commands).find((cmd) => cmd.name == command || cmd.aliases.includes(command));
                        console.log(`${user.name()} used /${command}`);
                        if (!commandObj) return socket.send(`Error: Command "${command}" not found!`);
                        try {
                            commandObj.command.call(server, {
                                user,
                                command,
                                args,
                                sendInChannel: function (msg, channel) {
                                    console.log(msg, channel)
                                    server.sendInChannel(msg, channel, server);
                                },
                                server: server,
                                commands,
                            });
                        } catch (error) {
                            console.error(error);
                            user.socket.send(`Unexpected error ocurred while running the command`);
                        }
                        return;
                    }
                    if (rawData.toString().startsWith(":client")) {
                        let client = String(rawData).replace(":client", "");
                        if (!client) return socket.send("Error: client info missing!");
                        if (client.length < 2) return socket.send("Error: client info too short!");
                        if (client.length >= 100) return socket.send("Error: client info too long!");
                        user.client = client;
                        return;
                    }
                    if(handleJsonMessage(server, rawData, user)) return;
                    if (server.config.requireLogin && user.guest && !server.annonChannels.includes(user.channel)) return socket.send("This server requires you to log in, use /login <username> <password> to log in or /register <username> <password> to make an account.");
                    profanity.options.grawlixChar = "*";
                    if (!server.config.profanity) rawData = profanity.censor(String(rawData));
                    if (rawData.length < 1) return socket.send("Error: message too short!");
                    if (rawData.length >= 2000) return socket.send("Error: message too long!");
                    server.sendInChannel(`${user.admin ? '[ADMIN] ' : ''}<${user.name()}${user.guest ? " (guest)" : ""}> ${rawData}`, user.channel);
                    console.log(`(#${user.channel}) <${user.name()}> ${rawData}`);
                });
            } catch (error) {
                socket.send(`ERROR ${error}`);
                socket.close()
            }
        });
        this.ws.on("listening", () => {
            console.info("Server started!");
        });
    }
}