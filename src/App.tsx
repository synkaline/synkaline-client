import { useContext, useState } from 'react'
import WebSocketProvider, { WebSocketContext } from '@/contexts/websocket.context'
import { Radio } from '@/pages/Radio';
import Radiov2 from './pages/Radio/Radiov2';
import './index.css'

function App() {




	return (
		<WebSocketProvider>
			<Radiov2 />
		</WebSocketProvider>
	)
}

export default App
