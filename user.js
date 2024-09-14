// because why not make *more files

import { getRandomInt } from "./lib.js";
import cuid from "cuid";

export default class User {
    /**
     * 
     * @param {import("http").IncomingMessage} request request
     * @param {import("./server.js").Server} server the server
     */
    constructor (request, socket, server) {
        this.id = cuid();
        let anonID = getRandomInt(0, 99999);
        let annonNum = "0".repeat(5 - anonID.toString().length) + anonID.toString()
        this.username = server.config.annonFormat ? server.config.annonFormat.replace('[num]', annonNum) : 'Anonymous' + annonNum;
        this.nickname = server.config.annonFormat ? server.config.annonFormat.replace('[num]', annonNum) : 'Anonymous' + annonNum;
        this.guest = true;
        this.socket = socket;
        this.joinReq = request;
        this.ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
        this.t = {
            js: Number(new Date()),
            unix: Math.floor(new Date().getTime() / 1000),
            str: String(new Date()),
        };
        this.channel = "home";
        this.name = function () {
            return this.nickname != "" ? this.nickname : this.username;
        };
    }
}