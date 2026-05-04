import { Server } from "socket.io";

// Initialize the Socket.io server on port 3000
const io = new Server(3000, {
  cors: { 
    origin: "*", // Allows your frontend to connect from anywhere during local testing
    methods: ["GET", "POST"]
  } 
});

console.log("🟢 WebRTC Signaling Server is running on port 3000");
console.log("Waiting for connections...");

io.on('connection', (socket) => {
  console.log(`[+] User connected: ${socket.id}`);
  
  // 1. Customer initiates transfer. Broadcast to ALL Agent Dashboards to build the Queue.
  socket.on('offer', (data) => {
    console.log(`[CALL] Incoming transfer request (Call ID: ${data.callId})`);
    // data payload expects: { callId, offer, socketId }
    socket.broadcast.emit('offer', data); 
  });
  
  // 2. An Agent clicks "Accept". We target the specific customer who made the request.
  socket.on('answer', (data) => {
    console.log(`[CALL] Agent accepted call (Call ID: ${data.callId}). Routing to customer...`);
    // data payload expects: { answer, to: customerSocketId, callId }
    
    // Tell the specific customer's browser to connect the WebRTC audio pipe
    io.to(data.to).emit('answer', data);
    
    // Broadcast to all OTHER agents that the call was taken, so it removes from their waiting queues
    socket.broadcast.emit('call-answered-elsewhere', data.callId);
  });
  
  // 3. Route network pathing (ICE Candidates) to specific peers so the audio can connect
  socket.on('ice-candidate', (data) => {
    if (data.to) {
        // Target specific routing: Agent sending candidate specifically to the Customer
        io.to(data.to).emit('ice-candidate', data);
    } else {
        // Broadcast routing: Customer sending to Agents (only the active agent will actually process it)
        socket.broadcast.emit('ice-candidate', data);
    }
  });

  // 4. Handle Disconnects
  socket.on('disconnect', () => {
    console.log(`[-] User disconnected: ${socket.id}`);
  });
});
