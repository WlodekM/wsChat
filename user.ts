// because why not make *more files

import { getRandomInt } from "./lib.js";
import cuid from "cuid";
import type { WebSocket } from 'ws'
import type { IncomingMessage } from "node:http";
import type Server from "./server.ts";
import Timespamp from "./timestamp.ts";

export default class User {
    id: string = cuid();
    username: string;
    nickname: string;
    guest: boolean;
    socket: WebSocket;
    joinReq: IncomingMessage;
    ip: string;
    t: Timespamp;
    channel: string;
    client?: string = undefined;
    admin: boolean = false;
    /**
     * the user class
     */
    constructor (request: IncomingMessage, socket: WebSocket, server: Server) {
        const anonID = getRandomInt(0, 99999);
        const annonNum = "0".repeat(5 - anonID.toString().length) + anonID.toString()
        this.username = server.config.accounts.annonFormat ? server.config.accounts.annonFormat.replace('[num]', annonNum) : 'Anonymous' + annonNum;
        this.nickname = server.config.accounts.annonFormat ? server.config.accounts.annonFormat.replace('[num]', annonNum) : 'Anonymous' + annonNum;
        this.guest = true;
        this.socket = socket;
        this.joinReq = request;
        this.ip = (request.headers["x-forwarded-for"] ?? [null])[0] ?? request.socket.remoteAddress ?? '';
        this.t = new Timespamp(new Date());
        this.channel = "home";
    }
    name () {
        return this.nickname != "" ? this.nickname : this.username;
    }
}