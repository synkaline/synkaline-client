import { useState, useEffect, useRef, useContext } from 'react';
import { WebSocketContext } from '@/contexts/websocket.context'; // assuming this is your WebSocket context
import { Message } from '@/structures/Message';
import { isCustomEvent } from '@/utils/isCustonEvent';

export default function Radio() {
    const [loadedAudio, setLoadedAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const wsm = useContext(WebSocketContext);

    // Connect to WebSocket only once on mount
    useEffect(() => {
        if (!wsm || !audioRef.current) return;

        wsm.connect()

        // on ws load, get audio data
        const handleWsOpen = () => {
            console.log("sending");

        };

        const handleAudioData = (ev: any) => {
            if (!isCustomEvent(ev)) return;

            let data = ev.detail;
            let videoId = data[0].id;
            console.log(videoId);
            audioRef.current!.src = `http://localhost:3000/getAudio?id=${videoId}`;
            audioRef.current!.load();

            // once audio is loaded for the first time
            audioRef.current!.addEventListener('canplaythrough', function canplay() {
                // console.log('can play');
                // setLoadedAudio(true);
                wsm.send(new Message({
                    type: Message.types.GET_SEEK
                }));
            }, { once: true });
        };

        const handleSeekData = (ev: any) => {
            if (!isCustomEvent(ev)) return;

            let data = ev.detail;
            let seek = data[0].seek;

            let st = Date.now();
            audioRef.current!.currentTime = seek / 1000;

            audioRef.current!.addEventListener('canplaythrough', () => {
                if (Date.now() - st > 1000) {
                    console.log('couldn\'t seek because it took too long');
                    wsm.send(new Message({
                        type: Message.types.GET_SEEK
                    }));
                } else {
                    console.log("Audio is seekable, playing now", audioRef.current!.paused)
                    if (audioRef.current?.paused) audioRef.current.play();
                }
            }, { once: true });
        };

        wsm.addEventListener('wsopen', handleWsOpen);
        wsm.addEventListener(Message.types[Message.types.GET_AUDIO], handleAudioData);
        wsm.addEventListener(Message.types[Message.types.GET_SEEK], handleSeekData);

        return () => {
            wsm.removeEventListener('wsopen', handleWsOpen);
            wsm.removeEventListener(Message.types[Message.types.GET_AUDIO], handleAudioData);
            wsm.removeEventListener(Message.types[Message.types.GET_SEEK], handleSeekData);
        };
    }, [wsm]);

    function onPlay() {
        wsm.send(new Message({
            type: Message.types.GET_AUDIO
        }));
        // audioRef.current.play();
    }

    return (
        <>
            <div>radio</div>
            <audio ref={audioRef} preload='auto' controls />
            <button onClick={onPlay} disabled={false}>play</button>
        </>
    );
}
