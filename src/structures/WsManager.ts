import { Message } from '@/structures/Message'
import { Logger } from "@/utils/Logger";


class WsManager extends EventTarget {

    ws: null | WebSocket;
    lt: number;
    host: string;
    wsprotocol: string;
    httpprotocol: string;
    _open: boolean;
    attachedChannelEvents: boolean;
    hasFinishedInitialLoad: boolean;

    private _lastMessageSent: { m: Message | null, t: number };


    constructor() {
        super();

        this.ws = null;
        this.lt = performance.now();
        this.host = 'localhost:3000'
        // this.host = import.meta.env[import.meta.env.DEV ? 'VITE_SERVER_DEV' : 'VITE_SERVER_PROD'];
        this.wsprotocol = 'ws'; //window.location.protocol === 'http:' ? 'ws' : 'wss';
        this.httpprotocol = window.location.protocol === 'http:' ? 'http' : 'https';
        this._lastMessageSent = { m: null, t: Date.now() };
        this._open = false;
        this.hasFinishedInitialLoad = false;
        this.attachedChannelEvents = false;

    }


    connect() {
        const protocol = this.wsprotocol;
        const hostname = this.host;


        this.ws = new WebSocket(`${protocol}://${hostname}`);

        this.ws.binaryType = 'arraybuffer';
        this.ws.addEventListener('open', this.onOpen.bind(this));
        this.ws.addEventListener('error', this.onError.bind(this));
        this.ws.addEventListener('close', this.onClose.bind(this));
        this.ws.addEventListener('message', this.onMessage.bind(this))
    }

    disconnect() {
        this._open = false;

        this.ws?.close();

        this.hasFinishedInitialLoad = false;
        this.dispatchEvent(new CustomEvent('wsclose'))


    }

    send(data: Message | Buffer) {
        let message: Buffer, m: Message | null;
        if (data instanceof Message) {
            message = data.encode();
            m = data;
        } else {
            message = data;
            m = Message.decode(data);
        }

        this.ws?.send(message);
        this._lastMessageSent = {
            m: m,
            t: Date.now()
        }
    }

    getPing() {
        return (Date.now() - this._lastMessageSent.t) / 1000;
    }

    private onOpen() {
        this._open = true;
        Logger.logc('blue', 'WS_OPEN', 'eslabished connection to ' + this.host);
        // this.wsHandshake();

        this.dispatchEvent(new CustomEvent('wsopen'));
    }

    private onClose() {
        Logger.logc('blue', 'WS_CLOSE', 'websocket connection terminated');
    }

    private onError(e: Event) {
        Logger.logc('red', 'WS_ERROR', e);
    }

    private onMessage(event: MessageEvent<any>) {
        const message = Message.decode(event.data);


        if (!message) return;

        Logger.logc('yellow', 'WS_MESSAGE', `${Message.types[message.type]}`, message);



        this.dispatchEvent(new CustomEvent(Message.types[message.type], { detail: message.data }))
    }

}

export default WsManager;