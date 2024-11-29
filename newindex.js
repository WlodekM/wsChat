import Server from './server.ts';
import ini from "ini"
import fs from "node:fs"

new Server(ini.parse(String(fs.readFileSync("config.ini"))))
