import Server from './server.js';
import ini from "ini"
import fs from "fs"

const server = new Server(ini.parse(String(fs.readFileSync("config.ini"))))
