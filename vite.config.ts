import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const DB_PATH = path.resolve(__dirname, 'db.json');

const TODAY = "2026-06-23";

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      profile: { name: "Karthik", email: "karthik@easydose.app", password: "mypassword" },
      reminders: [
        { id: 1, label: "Paracetamol", sub: "2 tablets · After breakfast", time: "08:00 AM", color: "#008b8b", taken: false, emoji: "💊", date: TODAY },
        { id: 2, label: "Dolo 550", sub: "1 tablet · With water", time: "12:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: TODAY },
        { id: 3, label: "Cetirizin", sub: "1 tablet · Before food", time: "06:00 PM", color: "#008b8b", taken: false, emoji: "💊", date: TODAY },
        { id: 4, label: "Vitamin D3", sub: "1 capsule · Before sleep", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: TODAY },
        { id: 5, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: "2026-06-22" },
        { id: 6, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: "2026-06-22" },
        { id: 7, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: "2026-06-22" },
        { id: 8, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: "2026-06-21" },
        { id: 9, label: "Cetirizin", sub: "1 tablet", time: "06:00 PM", color: "#008b8b", taken: false, emoji: "💊", date: "2026-06-21" },
        { id: 10, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: "2026-06-20" },
        { id: 11, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: "2026-06-19" },
        { id: 12, label: "Paracetamol", sub: "2 tablets", time: "08:00 AM", color: "#008b8b", taken: true, emoji: "💊", date: "2026-06-18" },
        { id: 13, label: "Cetirizin", sub: "1 tablet", time: "06:00 PM", color: "#008b8b", taken: true, emoji: "💊", date: "2026-06-17" },
        { id: 14, label: "Dolo 550", sub: "1 tablet", time: "12:00 PM", color: "#2563eb", taken: false, emoji: "💊", date: "2026-06-16" },
        { id: 15, label: "Vitamin D3", sub: "1 capsule", time: "10:00 PM", color: "#2563eb", taken: true, emoji: "💊", date: "2026-06-15" }
      ],
      caretakers: [
        { id: 1, name: "Priya Sharma", phone: "+91 98765 43210" },
        { id: 2, name: "Ravi Kumar", phone: "+91 87654 32109" }
      ],
      members: [
        { id: 1, name: "Amma (Mom)" },
        { id: 2, name: "Appa (Dad)" }
      ],
      appointments: [
        { id: 1, doctor: "Dr. Arun Raj", specialty: "Cardiologist", date: "2026-06-28", time: "10:00", notes: "Regular checkup" },
        { id: 2, doctor: "Dr. Meena V", specialty: "Neurologist", date: "2026-07-05", time: "14:00", notes: "Follow-up" }
      ],
      health: {
        waterIntake: 1450,
        sleepHours: 7.2,
        sleepQuality: 84,
        bedtime: "22:30",
        waketime: "06:00",
        bpSystolic: 118,
        bpDiastolic: 76,
        heartRate: 72,
        heartRateHistory: [68, 70, 72, 74, 71, 73, 72]
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: () => void) => {
      if (req.url && req.url.startsWith('/api')) {
        res.setHeader('Content-Type', 'application/json');
        
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          const method = req.method;
          const url = req.url!;
          const db = readDB();

          // 1. Profile Routes
          if (url === '/api/profile') {
            if (method === 'GET') {
              res.end(JSON.stringify(db.profile));
            } else if (method === 'PUT') {
              const payload = JSON.parse(body);
              db.profile = { ...db.profile, ...payload };
              writeDB(db);
              res.end(JSON.stringify(db.profile));
            }
          }
          // 2. Reminders Routes
          else if (url.startsWith('/api/reminders')) {
            if (method === 'GET') {
              res.end(JSON.stringify(db.reminders));
            } else if (method === 'POST') {
              const payload = JSON.parse(body);
              const items = Array.isArray(payload) ? payload : [payload];
              db.reminders = [...db.reminders, ...items];
              writeDB(db);
              res.end(JSON.stringify({ success: true, count: items.length }));
            } else if (method === 'PUT') {
              const parts = url.split('/');
              const id = parseInt(parts[parts.length - 1]);
              db.reminders = db.reminders.map((r: any) => r.id === id ? { ...r, taken: !r.taken } : r);
              writeDB(db);
              res.end(JSON.stringify({ success: true }));
            } else if (method === 'DELETE') {
              const parts = url.split('/');
              const id = parseInt(parts[parts.length - 1]);
              db.reminders = db.reminders.filter((r: any) => r.id !== id);
              writeDB(db);
              res.end(JSON.stringify({ success: true }));
            }
          }
          // 3. Caretakers Routes
          else if (url.startsWith('/api/caretakers')) {
            if (method === 'GET') {
              res.end(JSON.stringify(db.caretakers));
            } else if (method === 'POST') {
              const payload = JSON.parse(body);
              db.caretakers.push(payload);
              writeDB(db);
              res.end(JSON.stringify(payload));
            } else if (method === 'DELETE') {
              const parts = url.split('/');
              const id = parseInt(parts[parts.length - 1]);
              db.caretakers = db.caretakers.filter((c: any) => c.id !== id);
              writeDB(db);
              res.end(JSON.stringify({ success: true }));
            }
          }
          // 4. Family Members Routes
          else if (url.startsWith('/api/members')) {
            if (method === 'GET') {
              res.end(JSON.stringify(db.members));
            } else if (method === 'POST') {
              const payload = JSON.parse(body);
              db.members.push(payload);
              writeDB(db);
              res.end(JSON.stringify(payload));
            } else if (method === 'DELETE') {
              const parts = url.split('/');
              const id = parseInt(parts[parts.length - 1]);
              db.members = db.members.filter((m: any) => m.id !== id);
              writeDB(db);
              res.end(JSON.stringify({ success: true }));
            }
          }
          // 5. Doctor Appointments Routes
          else if (url.startsWith('/api/appointments')) {
            if (method === 'GET') {
              res.end(JSON.stringify(db.appointments));
            } else if (method === 'POST') {
              const payload = JSON.parse(body);
              db.appointments.push(payload);
              writeDB(db);
              res.end(JSON.stringify(payload));
            } else if (method === 'DELETE') {
              const parts = url.split('/');
              const id = parseInt(parts[parts.length - 1]);
              db.appointments = db.appointments.filter((a: any) => a.id !== id);
              writeDB(db);
              res.end(JSON.stringify({ success: true }));
            }
          }
          // 6. Health Metrics Routes
          else if (url === '/api/health') {
            if (method === 'GET') {
              res.end(JSON.stringify(db.health));
            } else if (method === 'PUT') {
              const payload = JSON.parse(body);
              db.health = { ...db.health, ...payload };
              writeDB(db);
              res.end(JSON.stringify(db.health));
            }
          }
          else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not Found' }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    apiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
