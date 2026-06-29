import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('connect_error', (err) => console.error('Socket connection error:', err));

export default socket;
