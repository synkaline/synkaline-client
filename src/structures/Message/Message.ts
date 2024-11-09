import { decode, encode } from 'msgpack-lite';
import MessageTypes from './MessageType';

type DeflatedMessage = [MessageTypes, ...any[]];
class Message<DataType extends Array<any> = any[]> {

    static types = MessageTypes

    type: MessageTypes;
    data: DataType;

    constructor({ type, data = [] as any as DataType }: { type: MessageTypes, data?: DataType }) {
        this.type = type;
        this.data = data;
    }


    deflate(): DeflatedMessage {
        return [this.type, ...(this.data || [])];
    }

    encode(): Buffer {
        return encode(this.deflate());
    }

    static deflate(message: Message): DeflatedMessage {
        return [message.type, ...(message.data || [])];
    }

    static encode(message: Message) {
        return encode(Message.deflate(message));
    }

    static decode(message: ArrayBuffer | DataView): Message | null {
        let data = new Uint8Array(message instanceof DataView ? message.buffer : message);
        let decodedMessage = decode(data);

        if (!Array.isArray(decodedMessage)) {
            try {
                decodedMessage = Array.from(decodedMessage);
                if (!decodedMessage) return null;
            } catch (e) {
                return null;
            }
        }

        return new Message({
            type: decodedMessage.shift(),
            data: decodedMessage.length === 0 ? [] : decodedMessage
        });
    }
}

const ping = new Message({ type: MessageTypes.PING }).encode();
const pong = new Message({ type: MessageTypes.PONG }).encode();


export default Message;
export { Message, ping, pong };
export type { DeflatedMessage };