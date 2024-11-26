export default class Timespamp {
    js: number;
    unix: number;
    str: string;
    constructor (date: Date) {
        this.js = Number(date)
        this.unix = Math.floor(date.getTime() / 1000)
        this.str = String(date)
    }
}