import { useState, useEffect, useRef, useContext } from 'react';
import { WebSocketContext } from '@/contexts/websocket.context'; // assuming this is your WebSocket context
import { Message } from '@/structures/Message';
import { isCustomEvent } from '@/utils/isCustonEvent';
import { AnimationFrame, Visualizer } from '@/structures/Visualizer';

export default function Radiov2() {
    const [loadingAudio, setLoadingAudio] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [loadedAudio, setLoadedAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsm = useContext(WebSocketContext);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Connect to WebSocket only once on mount
    useEffect(() => {
        if (!wsm || !audioRef.current || !canvasRef.current) return;

        wsm.connect()

        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;

        // let wave = new Wave(audioRef.current!, canvasRef.current!);

        // // Simple example: add an animation
        // wave.addAnimation(new wave.animations.Lines({
        //     lineWidth: 3,
        //     lineColor: 'red'
        // }));
        const visualizer = new Visualizer(audioRef.current, canvasRef.current);
        visualizer.connect()
        const frame = new AnimationFrame(60, visualizer.render.bind(visualizer))

        frame.start()
    



        // on ws load, get audio data
        const handleWsOpen = () => {
            console.log("ws open");

            // request initial audio

        };


        const handleAudioData = (ev: any) => {
            if (!isCustomEvent(ev)) return;
            setLoadedAudio(false)
            setLoadingAudio(true)
            let data = ev.detail;
            let videoId = data[0].id;
            console.log(videoId);
            audioRef.current!.src = `http://localhost:3000/getAudio?id=${videoId}`;
            audioRef.current!.load();

            // once audio is loaded for the first time
            audioRef.current!.addEventListener('canplaythrough', function canplay() {
                // get the seek value
                setLoadedAudio(true)
                setLoadingAudio(false)
                requestSeek()
            }, { once: true });
        };

        const handleSeekData = (ev: any) => {
            if (!isCustomEvent(ev)) return;

            // handle case when user spams play button causing timeout buildup,
            if (timeoutId != null) {
                clearTimeout(timeoutId)
                setTimeoutId(null)
            }
            console.log(`latency ${wsm.getPing()}s`)
            let data = ev.detail;
            let seek = data[0].seek;

            seek += wsm.getPing()


            // used to see how long it takes for the seeked section to be playable
            let st = Date.now();
            // set seek value to trigger canplaythrough and see when its ready to play
            audioRef.current!.currentTime = seek / 1000;

            audioRef.current!.addEventListener('canplaythrough', () => {
                // if it takes more than 1 second to load the seeked section of song, request new seek section
                // pretty much like buffering
                if (Date.now() - st > 1000) {
                    console.log('couldn\'t seek because it took too long');
                    requestSeek()
                } else {
                    console.log("Audio is seekable, playing now", audioRef.current!.paused)
                    // audio section is playable now
                    // handle case when seek value is less than 0, happens because server has a load delay
                    // load delay grants users some time to load the audio before the server starts playback
                    // seek is negative when user loads data faster than load delay
                    // in such case set a timeout and start by syncing with server playback
                    if (seek < 0) {
                        audioRef.current!.paused && audioRef.current!.pause()
                        const wait = Math.abs(seek);
                        console.log(`seek is below 0, waiting for ${wait}ms`)
                        audioRef.current!.pause()
                        let id = setTimeout(() => {
                            // synced with server time
                            audioRef.current!.play()
                            timeoutId && clearTimeout(timeoutId)
                        }, wait);

                        setTimeoutId(id);
                    } else if (audioRef.current?.paused)
                        // seek is positive, play if audio is paused
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
        if (!playing) {
            loadedAudio ? requestSeek() : requestAudio();

        } else {
            audioRef.current!.pause()
        }
        setPlaying(!playing)

    }

    return (
        <>
            <canvas ref={canvasRef} style={{
                position: 'absolute'
            }}></canvas>
            <audio hidden crossOrigin='anonymous' ref={audioRef} preload='auto' controls />
            <button style={{ position: 'fixed' }} onClick={onClick} disabled={false}>{playing ? 'Click to Pause' : 'Click to listen'}</button>

        </>
    );
}
