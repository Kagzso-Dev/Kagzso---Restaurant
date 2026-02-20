const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            process.env.CLIENT_URL,
        ].filter(Boolean),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});

app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes'));

// ─── Socket.IO ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    /**
     * Clients join a branch-specific room on connect.
     * This ensures kitchen/cashier/waiter only receive events
     * for their own branch — complete isolation.
     *
     * Frontend should emit: socket.emit('join-branch', branchId)
     */
    socket.on('join-branch', (branchId) => {
        if (!branchId) return;
        const room = `branch_${branchId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    // Legacy room join (kept for backward compat)
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

// Make io accessible in controllers via req.app.get('socketio')
app.set('socketio', io);

// ─── Auto-Release Timer ──────────────────────────────────────────────────────
// Every 2 minutes, release tables that have been "reserved" >10 min with no order
const { autoReleaseExpiredReservations } = require('./controllers/tableController');
setInterval(() => autoReleaseExpiredReservations(io), 2 * 60 * 1000);
// Run once at startup to clean any stale reservations
autoReleaseExpiredReservations(io);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', message: 'KOT API running' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
