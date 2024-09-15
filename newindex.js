import Server from './server.js';

const server = new Server(JSON.parse(String(fs.readFileSync("config.json"))))
