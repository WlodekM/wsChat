import Server from './server.js';
import ini from "ini"

const server = new Server(ini.parse(String(fs.readFileSync("config.ini"))))
