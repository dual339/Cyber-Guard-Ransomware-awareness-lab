import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT || 3000);
  const MALWAREBAZAAR_API_URL = 'https://mb-api.abuse.ch/api/v1/';

  app.use(express.json());

  app.post('/api/hash-lookup', async (req, res) => {
    const hash = String(req.body?.hash || '').trim().toLowerCase();
    const authKey = process.env.MALWAREBAZAAR_AUTH_KEY;

    if (!hash) {
      res.status(400).json({ error: 'Missing hash.' });
      return;
    }

    if (!/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(hash)) {
      res.status(400).json({ error: 'Invalid hash. Expected MD5, SHA-1, or SHA-256.' });
      return;
    }

    if (!authKey) {
      res.status(503).json({
        error: 'Malware database lookup is not configured.',
        code: 'missing_auth_key',
      });
      return;
    }

    try {
      const payload = new URLSearchParams({
        query: 'get_info',
        hash,
      });

      const response = await fetch(MALWAREBAZAAR_API_URL, {
        method: 'POST',
        headers: {
          'Auth-Key': authKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      if (!response.ok) {
        res.status(502).json({ error: 'Malware database lookup failed upstream.' });
        return;
      }

      const data = await response.json() as {
        query_status?: string;
        data?: Array<{
          sha256_hash?: string;
          sha3_384_hash?: string;
          md5_hash?: string;
          sha1_hash?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          signature?: string;
          first_seen?: string;
          last_seen?: string;
          tags?: string[];
          intelligence?: { uploads?: number; mail?: Record<string, unknown> };
          vendor_intel?: Record<string, unknown>;
        }>;
      };

      if (data.query_status === 'ok' && data.data?.[0]) {
        const match = data.data[0];
        res.json({
          found: true,
          source: 'MalwareBazaar',
          match: {
            sha256: match.sha256_hash || null,
            sha1: match.sha1_hash || null,
            md5: match.md5_hash || null,
            fileName: match.file_name || null,
            fileType: match.file_type || null,
            fileSize: match.file_size || null,
            signature: match.signature || null,
            firstSeen: match.first_seen || null,
            lastSeen: match.last_seen || null,
            tags: match.tags || [],
          },
        });
        return;
      }

      if (data.query_status === 'hash_not_found') {
        res.json({
          found: false,
          source: 'MalwareBazaar',
        });
        return;
      }

      res.status(502).json({
        error: 'Unexpected malware database response.',
        code: data.query_status || 'unknown_response',
      });
    } catch (error) {
      console.error('Hash lookup failed:', error);
      res.status(502).json({ error: 'Hash lookup failed.' });
    }
  });

  // Real-time Simulation Rooms
  const rooms = new Map<string, {
    attackerId: string | null;
    defenderId: string | null;
    status: 'waiting' | 'ready' | 'attacking' | 'finished';
    files: any[];
  }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId: string, role: 'attacker' | 'defender') => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          attackerId: null,
          defenderId: null,
          status: 'waiting',
          files: []
        });
      }

      const room = rooms.get(roomId)!;
      if (role === 'attacker') room.attackerId = socket.id;
      if (role === 'defender') room.defenderId = socket.id;

      if (room.attackerId && room.defenderId) {
        room.status = 'ready';
      }

      io.to(roomId).emit('room-update', room);
      console.log(`User ${socket.id} joined room ${roomId} as ${role}`);
    });

    socket.on('start-attack', (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'attacking';
        io.to(roomId).emit('attack-started');
        io.to(roomId).emit('room-update', room);
      }
    });

    socket.on('file-encrypted', (roomId: string, fileId: string) => {
      io.to(roomId).emit('file-status-update', { fileId, status: 'encrypted' });
    });

    socket.on('broadcast-drill-event', (roomId: string, event: { level: string; message: string }) => {
      io.to(roomId).emit('drill-event', {
        by: socket.id,
        level: event.level,
        message: event.message,
      });
    });

    socket.on('contain-attack', (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'finished';
        io.to(roomId).emit('attack-contained');
        io.to(roomId).emit('room-update', room);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [roomId, room] of rooms.entries()) {
        if (room.attackerId === socket.id) {
          room.attackerId = null;
          room.status = 'waiting';
          io.to(roomId).emit('room-update', room);
        }
        if (room.defenderId === socket.id) {
          room.defenderId = null;
          room.status = 'waiting';
          io.to(roomId).emit('room-update', room);
        }
        // If room is empty, optionally delete it
        if (!room.attackerId && !room.defenderId) {
          rooms.delete(roomId);
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
