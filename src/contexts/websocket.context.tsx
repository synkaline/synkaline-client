import { createContext } from 'react';
import WsManager from '@/structures/WsManager';


const WebSocketContext = createContext<WsManager>(null as any);


const WebSocketProvider = ({ children }: any) => {
    const wsm = new WsManager();


    return (
        <WebSocketContext.Provider value={wsm}>
            {children}
        </WebSocketContext.Provider>
    )
}

export default WebSocketProvider;
export { WebSocketContext };