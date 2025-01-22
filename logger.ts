import * as fs from 'node:fs'

function logAndPrint(text: string, logShit: any[]) {
    if (!fs.existsSync('server.log'))
        fs.writeFileSync('server.log', '');
    fs.appendFileSync('server.log', '\n' + text);
    console.log(...logShit)
}

export function log(text: any) {
    logAndPrint(String(text), [text])
}

export function info(text: any) {
    logAndPrint('[INFO] ' + text, ['[INFO]', text])
}

export function error(text: any) {
    logAndPrint('[ERR] ' + text, ['[ERR]', text])
}