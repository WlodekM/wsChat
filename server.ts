import { WebSocketServer, WebSocket } from "ws";
import { profanity } from "@2toad/profanity";
import { commands, type Command } from "./commands.ts";
import * as accounts from "./accounts.ts";
import fs from "node:fs";
import User from "./user.ts";
import handleJsonMessage from './jsondata.js'
import { EventEmitter } from "node:events";

// TODO - actually make this
class _Events { // JSON events for clients
    
}

type ServerConfig = {
    port: number
    name: string
    motd: string
    fullMessage: string
    max: number
}

type AccountsConfig = {
    owner: string
    saveIP: boolean
    requireLogin: boolean
    annonFormat: string
}

type ProfanityConfig = {
    filter: boolean
    removeWords: string
    addWords: string
}

type ChannelsConfig = {
    channels: string
}

type ChannelConfig = {
    slowmode?: number
    requireLogin?: boolean
    profanity?: boolean
}

type addPrefixToObject<T, P extends string> = {
    [K in keyof T as K extends string ? `${P}${K}` : never]: T[K]
}

type Config = {
    server: ServerConfig
    accounts: AccountsConfig
    channels: ChannelsConfig
    profanity: ProfanityConfig
    [key: string]: ServerConfig | AccountsConfig | ChannelsConfig | ProfanityConfig | ChannelConfig;
}

export default class Server {
    config: Config;
    channels: string[];
    users: Map<string, User> = new Map();
    accounts = accounts;
    ws: WebSocketServer&EventEmitter;
    /**
     * A wsChat server
     */
    constructor (config: Config) {
        this.config = config;
        this.channels = this.config.channels.channels.split(/, */g);
        // this.annonChannels = this.config.annonChannels.split(/, */g);
        this.ws = new WebSocketServer({
            port: this.config.server.port,
        });

        if (this.config.profanity.removeWords) profanity.removeWords(this.config.profanity.removeWords.split(/, */g));
        if (this.config.profanity.addWords) profanity.addWords(this.config.profanity.addWords.split(/, */g));

        // deno-lint-ignore no-this-alias
        const server = this;

        if (!fs.existsSync("db/bannedIps.json")) fs.writeFileSync("db/bannedIps.json", "{}");

        this.ws.on("connection", (socket: WebSocket, request) => {
            try {
                if (server.config.server.max && Object.keys(server.users).length >= server.config.server.max) {
                    socket.send(server.format(server.config.server.fullMessage ?? "Sorry, but the server is full right now, come back later"));
                    socket.close(1001, "Server full");
                    return;
                }
                const user: User = new User(request, socket, server)
                server.users.set(user.id, user);
                type IPbanList = {
                    [key: string]: string
                }
                const ipBanList: IPbanList = JSON.parse(String(fs.readFileSync("db/bannedIps.json")));
                if (user.ip && ipBanList[user.ip[0]]) {
                    socket.send("Your IP is banned for " + ipBanList[user.ip[0]]);
                    socket.close(1002, "Banned");
                    return;
                }
                socket.send(server.format(server.config.server.motd));
                console.info(`${user.name()}[${user.id}] joined the server!`);
                server.sendInChannel(`${user.name()} joined.`, user.channel);
                server.updateUsers();
                socket.on("close", function () {
                    server.sendInChannel(`${user.name()} left.`, user.channel);
                    server.updateUsers();
                    server.users.delete(user.id);
                });
                socket.on("message", function (rawData) {
                    let data: string = rawData.toString()
                    if (data.toString().startsWith("/")) {
                        const args: string[] = String(data).replace("/", "").split(" ");
                        const command: string = args.shift() as string;
                        // TODO: make command class
                        const commandObj: Command = Object.values(commands).find((cmd) => cmd.name == command || cmd.aliases.includes(command)) as Command;
                        console.log(`${user.name()} used /${command}`);
                        if (!commandObj) return socket.send(`Error: Command "${command}" not found!`);
                        try {
                            commandObj.command.call(server, {
                                user,
                                command,
                                args,
                                sendInChannel: function (msg: string, channel: string) {
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
                    if (data.toString().startsWith(":client")) {
                        const client = String(data).replace(":client", "");
                        if (!client) return socket.send("Error: client info missing!");
                        if (client.length < 2) return socket.send("Error: client info too short!");
                        if (client.length >= 100) return socket.send("Error: client info too long!");
                        user.client = client;
                        return;
                    }
                    if(handleJsonMessage(server, data, user)) return;
                    const thisChannelConfig: ChannelConfig | undefined = server.config['channel-'+user.channel] as ChannelConfig;
                    if (server.config.accounts.requireLogin && user.guest && thisChannelConfig?.requireLogin != undefined && !thisChannelConfig.requireLogin)
                        return socket.send("This server requires you to log in, use /login <username> <password> to log in or /register <username> <password> to make an account.");
                    profanity.options.grawlixChar = "*";
                    if (server.config.profanity.filter) data = profanity.censor(String(data));
                    if (data.length < 1) return socket.send("Error: message too short!");
                    if (data.length >= 2000) return socket.send("Error: message too long!");
                    server.sendInChannel(`${user.admin ? '[ADMIN] ' : ''}<${user.name()}${user.guest ? " (guest)" : ""}> ${data}`, user.channel);
                    console.log(`(#${user.channel}) <${user.name()}> ${data}`);
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

    sendInChannel(msg: string, channel: string, server=this) {
        // console.log('this is a', this)
        for (const [userID] of server.users.entries()) {
            const user = server.users.get(userID) as User;
            if (user.channel == channel) user.socket.send(msg);
        }
    }
    
    format(txt: string) {
        txt = txt.replaceAll("$(serverName)$", this.config.server.name);
        txt = txt.replaceAll("$(userCount)$", [...this.users.entries()].length.toString());
        // for (const configName in this.config.server) {
        //     if (Object.prototype.hasOwnProperty.call(this.config.server, configName)) {
        //         const configValue = this.config.server[configName];
        //         if(typeof configValue != 'string' && typeof configValue != 'number') continue;
        //         txt = txt.replaceAll(`$(${configName})$`, configValue);
        //     }
        // }
        return txt;
    }
    
    //TODO - finish event system, rewrite this
    // updateUsers() {
    //     Object.keys(this.users).forEach((user) => {
    //         if (user.subscribedToUsers) {
    //             user.socket.send(
    //                 `:json.sub<users>:${JSON.stringify(
    //                     Object.values(this.users).map((usr) => {
    //                         return {
    //                             username: usr.username,
    //                             nickname: usr.nickname,
    //                             t: usr.t,
    //                             channel: user.channel,
    //                             displayName: user.name(),
    //                         };
    //                     })
    //                 )}`
    //             );
    //         }
    //     });
    // }
    updateUsers() {}
}