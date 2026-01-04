const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Armazenamento em memória
const users = new Map();
const chatRooms = new Map();
const supportTickets = new Map();
const messages = new Map();

// ================================================
// Rotas da API
// ================================================

// Usuários
app.post('/api/users/register', (req, res) => {
  const { username, email } = req.body;
  const userId = uuidv4();
  const user = {
    id: userId,
    username,
    email,
    createdAt: new Date().toISOString(),
    isOnline: true
  };
  users.set(userId, user);
  res.json({ success: true, user });
});

app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json(userList);
});

app.get('/api/users/online', (req, res) => {
  const onlineUsers = Array.from(users.values()).filter(u => u.isOnline);
  res.json(onlineUsers);
});

// Salas de Chat
app.post('/api/rooms', (req, res) => {
  const { name, description, createdBy } = req.body;
  const roomId = uuidv4();
  const room = {
    id: roomId,
    name,
    description,
    createdBy,
    createdAt: new Date().toISOString(),
    participants: []
  };
  chatRooms.set(roomId, room);
  messages.set(roomId, []);
  res.json({ success: true, room });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(chatRooms.values());
  res.json(roomList);
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const roomMessages = messages.get(roomId) || [];
  res.json(roomMessages);
});

app.get('/api/rooms/user/:userId', (req, res) => {
  const { userId } = req.params;
  const userRooms = Array.from(chatRooms.values()).filter(room => 
    room.createdBy === userId || (room.participants && room.participants.includes(userId))
  );
  res.json({ success: true, rooms: userRooms });
});

// Tickets de Suporte
app.post('/api/tickets', (req, res) => {
  const ticketData = req.body;
  const ticketId = ticketData.id || uuidv4();
  const ticket = {
    ...ticketData,
    id: ticketId,
    createdAt: ticketData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  supportTickets.set(ticketId, ticket);
  res.json({ success: true, ticket });
});

app.post('/api/support/tickets', (req, res) => {
  const { userId, username, subject, description, priority, category } = req.body;
  const ticketId = uuidv4();
  const ticket = {
    id: ticketId,
    ticketNumber: `SUP-${Date.now().toString(36).toUpperCase()}`,
    userId,
    username,
    subject,
    description,
    priority: priority || 'medium',
    category: category || 'general',
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: []
  };
  supportTickets.set(ticketId, ticket);
  res.json({ success: true, ticket });
});

app.get('/api/support/tickets', (req, res) => {
  const { userId, status } = req.query;
  let ticketList = Array.from(supportTickets.values());
  
  if (userId) {
    ticketList = ticketList.filter(t => t.userId === userId);
  }
  if (status) {
    ticketList = ticketList.filter(t => t.status === status);
  }
  
  ticketList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(ticketList);
});

app.get('/api/tickets/user/:userId', (req, res) => {
  const { userId } = req.params;
  const userTickets = Array.from(supportTickets.values()).filter(t => t.userId === userId);
  userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, tickets: userTickets });
});

app.get('/api/support/tickets/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const ticket = supportTickets.get(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado' });
  }
  res.json(ticket);
});

app.put('/api/support/tickets/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const { status, priority } = req.body;
  const ticket = supportTickets.get(ticketId);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado' });
  }
  
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  
  supportTickets.set(ticketId, ticket);
  io.emit('ticket-updated', ticket);
  res.json({ success: true, ticket });
});

app.post('/api/support/tickets/:ticketId/responses', (req, res) => {
  const { ticketId } = req.params;
  const { userId, username, message, isAgent } = req.body;
  const ticket = supportTickets.get(ticketId);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket não encontrado' });
  }
  
  const response = {
    id: uuidv4(),
    userId,
    username,
    message,
    isAgent: isAgent || false,
    createdAt: new Date().toISOString()
  };
  
  ticket.responses.push(response);
  ticket.updatedAt = new Date().toISOString();
  supportTickets.set(ticketId, ticket);
  
  io.emit('ticket-response', { ticketId, response });
  res.json({ success: true, response, ticket });
});

app.get('/api/support/stats', (req, res) => {
  const tickets = Array.from(supportTickets.values());
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };
  res.json(stats);
});

// ================================================
// WebSocket para Chat em tempo real
// ================================================

io.on('connection', (socket) => {
  console.log('Usuário conectação:', socket.id);
  
  // Registro do usuário (formato antigo)
  socket.on('user-join', (userData) => {
    socket.userId = userData.userId;
    socket.username = userData.username;
    
    if (users.has(userData.userId)) {
      const user = users.get(userData.userId);
      user.isOnline = true;
      user.socketId = socket.id;
      users.set(userData.userId, user);
    }
    
    io.emit('user-online', { userId: userData.userId, username: userData.username });
  });
  
  // Registro do usuário (novo formato)
  socket.on('user:join', (userData) => {
    socket.userId = userData.id;
    socket.username = userData.username;
    
    if (users.has(userData.id)) {
      const user = users.get(userData.id);
      user.isOnline = true;
      user.socketId = socket.id;
      users.set(userData.id, user);
    }
  });
  
  // Criar sala
  socket.on('room:create', (data) => {
    const { userId, roomId } = data;
    socket.join(roomId);
    socket.currentRoom = roomId;
    
    const room = {
      id: roomId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      participants: [userId],
      isWithAI: true
    };
    chatRooms.set(roomId, room);
    messages.set(roomId, []);
  });
  
  // Transferir para humano
  socket.on('room:transfer', (data) => {
    const { roomId, userId } = data;
    
    // Atualizar sala
    const room = chatRooms.get(roomId);
    if (room) {
      room.isWithAI = false;
      chatRooms.set(roomId, room);
    }
    
    // Simular agente entrando
    setTimeout(() => {
      socket.emit('agent:joined', {
        id: 'agent_1',
        name: 'Maria Silva',
        status: 'Online'
      });
    }, 2000);
  });
  
  // Enviar mensagem (novo formato)
  socket.on('message:send', (data) => {
    const { roomId, content, userId } = data;
    const messageData = {
      id: uuidv4(),
      userId,
      content,
      roomId,
      timestamp: new Date().toISOString()
    };
    
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    messages.get(roomId).push(messageData);
    
    // Simular resposta do agente humano
    setTimeout(() => {
      socket.emit('message:received', {
        id: uuidv4(),
        roomId,
        content: 'Obrigação pela sua mensagem. Estou verificando a situação e já retorno.',
        timestamp: new Date().toISOString()
      });
    }, 1500);
  });
  
  // Entrar em uma sala (formato antigo)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.currentRoom = roomId;
    
    const room = chatRooms.get(roomId);
    if (room && room.participants && !room.participants.includes(socket.userId)) {
      room.participants.push(socket.userId);
      chatRooms.set(roomId, room);
    }
    
    io.to(roomId).emit('user-joined-room', {
      userId: socket.userId,
      username: socket.username,
      roomId
    });
  });
  
  // Sair de uma sala
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    io.to(roomId).emit('user-left-room', {
      userId: socket.userId,
      username: socket.username,
      roomId
    });
  });
  
  // Enviar mensagem (formato antigo)
  socket.on('send-message', (data) => {
    const { roomId, message } = data;
    const messageData = {
      id: uuidv4(),
      userId: socket.userId,
      username: socket.username,
      message,
      roomId,
      timestamp: new Date().toISOString()
    };
    
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    messages.get(roomId).push(messageData);
    
    io.to(roomId).emit('new-message', messageData);
  });
  
  // Digitando
  socket.on('typing', (roomId) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.userId,
      username: socket.username
    });
  });
  
  socket.on('stop-typing', (roomId) => {
    socket.to(roomId).emit('user-stop-typing', {
      userId: socket.userId
    });
  });
  
  // Chat privação
  socket.on('private-message', (data) => {
    const { toUserId, message } = data;
    const targetUser = users.get(toUserId);
    
    if (targetUser && targetUser.socketId) {
      const messageData = {
        id: uuidv4(),
        fromUserId: socket.userId,
        fromUsername: socket.username,
        toUserId,
        message,
        timestamp: new Date().toISOString()
      };
      
      io.to(targetUser.socketId).emit('private-message', messageData);
      socket.emit('private-message-sent', messageData);
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Usuário desconectação:', socket.id);
    
    if (socket.userId && users.has(socket.userId)) {
      const user = users.get(socket.userId);
      user.isOnline = false;
      users.set(socket.userId, user);
      io.emit('user-offline', { userId: socket.userId });
    }
  });
});

// ================================================
// Iniciar servidor
// ================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});
