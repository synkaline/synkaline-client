import { useState, useEffect, useRef, useContext } from 'react';
import { WebSocketContext } from '@/contexts/websocket.context'; // assuming this is your WebSocket context
import { Message } from '@/structures/Message';
import { isCustomEvent } from '@/utils/isCustonEvent';

export default function Radiov2() {
    const [loadedAudio, setLoadedAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const wsm = useContext(WebSocketContext);

    // Connect to WebSocket only once on mount
    useEffect(() => {
        if (!wsm || !audioRef.current) return;

        wsm.connect()

        // on ws load, get audio data
        const handleWsOpen = () => {
            console.log("ws open");

            // request initial audio

        };


        const handleAudioData = (ev: any) => {
            if (!isCustomEvent(ev)) return;
            setLoadedAudio(false)
            let data = ev.detail;
            let videoId = data[0].id;
            console.log(videoId);
            audioRef.current!.src = `http://localhost:3000/getAudio?id=${videoId}`;
            audioRef.current!.load();

            // once audio is loaded for the first time
            audioRef.current!.addEventListener('canplaythrough', function canplay() {
                // get the seek value
                setLoadedAudio(true)
                requestSeek()
            }, { once: true });
        };

        const handleSeekData = (ev: any) => {
            if (!isCustomEvent(ev)) return;
            console.log('latency', wsm.getPing())
            let data = ev.detail;
            let seek = data[0].seek;
            seek = Math.max(seek, 0);

            let st = Date.now();
            audioRef.current!.currentTime = seek / 1000;

            audioRef.current!.addEventListener('canplaythrough', () => {
                // seek distance is too far behind because it took too long to buffer, get new seek
                if (Date.now() - st > 1000) {
                    console.log('couldn\'t seek because it took too long');
                    requestSeek()
                } else {
                    console.log("Audio is seekable, playing now", audioRef.current!.paused)
                    if (audioRef.current?.paused)
                        audioRef.current.play();
                }
            }, { once: true });
        };

        wsm.addEventListener('wsopen', handleWsOpen);
        wsm.addEventListener(Message.types[Message.types.GET_AUDIO], handleAudioData);
        wsm.addEventListener(Message.types[Message.types.GET_SEEK], handleSeekData);
        wsm.addEventListener(Message.types[Message.types.NEW_TRACK], handleAudioData);


        return () => {
            wsm.removeEventListener('wsopen', handleWsOpen);
            wsm.removeEventListener(Message.types[Message.types.GET_AUDIO], handleAudioData);
            wsm.removeEventListener(Message.types[Message.types.GET_SEEK], handleSeekData);
            wsm.removeEventListener(Message.types[Message.types.NEW_TRACK], handleAudioData);

        };
    }, [wsm]);

    function requestAudio() {
        wsm.send(new Message({
            type: Message.types.GET_AUDIO
        }));
    }

    function requestSeek() {
        wsm.send(new Message({
            type: Message.types.GET_SEEK
        }));
    }

    function onClick() {
        loadedAudio ? requestSeek() : requestAudio();
    }

    return (
        <>
            <div>radiov2</div>
            <audio ref={audioRef} preload='auto' controls />
            <button onClick={onClick} disabled={false}>play</button>
        </>
    );
}
