import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.resolve(__dirname, 'database/ekinerja_store.json')
const UPLOADS_DIR = path.resolve(__dirname, 'database/uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  } catch (e) {}
}

function apiSyncPlugin() {
  return {
    name: 'api-sync-plugin',
    async configureServer(server) {
      const dbStore = await import('./server/dbStore.js')
      const pdfGen = await import('./server/pdfGenerator.js')
      const { 
        authenticateUser, 
        sanitizeUser, 
        hashPassword,
        getRegistrationCodes,
        createRegistrationCode,
        deleteRegistrationCode,
        registerNewUser,
        createWebSession,
        getWebSession,
        deleteWebSession,
        cleanupExpiredSessions,
        ONE_DAY_MS
      } = dbStore
      const { generateMonthlyReportPdf, generateMonthlyReportZip } = pdfGen

      // Muat .env jika tersedia
      if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') {
        try {
          process.loadEnvFile('.env')
        } catch (e) {}
      }

      // Auto-start Bot Telegram jika token telah diisi di .env
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
        import('./server/telegramBot.js').catch(err => {
          console.warn('[Vite Dev] Bot Telegram auto-start warning:', err.message)
        })
      }

      const getBotConfig = () => {
        const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
        const username = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim()
        return {
          enabled: Boolean(token),
          username: username
        }
      }

      const getAiConfig = () => {
        const rawKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '')
          .trim()
          .replace(/^["']|["']$/g, '')
          .trim()
        const hasServerKey = Boolean(
          rawKey &&
          !rawKey.includes('PASTE_HERE') &&
          !rawKey.includes('KEY_ANDA') &&
          rawKey.length > 10
        )
        return {
          enabled: hasServerKey,
          hasServerKey: hasServerKey,
          provider: 'gemini',
          model: 'gemini-2.5-flash'
        }
      }

      // Endpoint status Bot Telegram
      server.middlewares.use('/api/bot-status', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(getBotConfig()))
      })

      // Endpoint status Gemini AI Server-Side (Aman)
      server.middlewares.use('/api/ai-status', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(getAiConfig()))
      })
      server.middlewares.use('/api/ai/status', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(getAiConfig()))
      })

      // Endpoint AI Polish Server-Side (/api/ai/polish)
      server.middlewares.use('/api/ai/polish', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', async () => {
          let payload = {}
          try {
            payload = JSON.parse(body)
          } catch (e) {}

          try {
            const rawServerKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '')
              .trim()
              .replace(/^["']|["']$/g, '')
              .trim()
            const cleanApiKey = (payload.apiKey && payload.apiKey !== 'server-managed' && !payload.apiKey.startsWith('server-'))
              ? payload.apiKey.trim()
              : rawServerKey

            const { polishJournalNode } = await import('./server/aiServiceNode.js')
            const result = await polishJournalNode({
              rawText: payload.rawText || '',
              jabatan: payload.jabatan || '',
              unitKerja: payload.unitKerja || '',
              apiKey: cleanApiKey
            })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            try {
              const { polishJournalOfflineNode } = await import('./server/aiServiceNode.js')
              const fallback = polishJournalOfflineNode(payload.rawText || '')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(fallback))
            } catch (e2) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Gagal memproses pemolesan AI' }))
            }
          }
        })
      })

      // Endpoint Autentikasi Login Aman Server-Side
      server.middlewares.use('/api/auth/login', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          try {
            const { username, password } = JSON.parse(body)
            if (!username || !password) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: 'Username dan password wajib diisi!' }))
              return
            }
            const auth = authenticateUser(username, password)
            if (!auth.success) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: auth.message }))
              return
            }
            const session = createWebSession(auth.user)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ 
              success: true, 
              user: session.user,
              token: session.token,
              expiresAt: session.expiresAt
            }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, message: 'Invalid payload' }))
          }
        })
      })

      // Endpoint Registrasi Pengguna Baru di Dev Server
      server.middlewares.use('/api/auth/register', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}')
            const result = registerNewUser(payload)
            let session = null
            if (result.success && result.user) {
              session = createWebSession(result.user)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              ...result,
              token: session?.token,
              expiresAt: session?.expiresAt
            }))
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: err.message }))
          }
        })
      })

      // Endpoint Verifikasi Sesi Web di Dev Server (Maks 1 Hari)
      server.middlewares.use('/api/auth/verify-session', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        const u = new URL(req.url, 'http://localhost')
        const token = u.searchParams.get('token') || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
        const session = getWebSession(token)
        if (!session) {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ valid: false, message: 'Sesi telah berakhir atau tidak valid. Silakan login kembali.' }))
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          valid: true,
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt
        }))
      })

      // Endpoint Logout Sesi Web di Dev Server
      server.middlewares.use('/api/auth/logout', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          let token = ''
          try {
            const parsed = JSON.parse(body || '{}')
            token = parsed.token
          } catch (e) {}
          if (!token && req.url) {
            const u = new URL(req.url, 'http://localhost')
            token = u.searchParams.get('token') || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
          }
          if (token) deleteWebSession(token)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, message: 'Berhasil logout.' }))
        })
      })

      // Endpoint Admin Kode Registrasi di Dev Server
      server.middlewares.use('/api/admin/registration-codes', (req, res) => {
        if (req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ success: true, codes: getRegistrationCodes() }))
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}')
              const created = createRegistrationCode(payload)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, code: created }))
            } catch (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: err.message }))
            }
          })
          return
        }
        if (req.method === 'DELETE') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            let codeId = ''
            if (body) {
              try {
                const parsed = JSON.parse(body)
                codeId = parsed.id || parsed.code
              } catch (e) {}
            }
            if (!codeId && req.url) {
              const u = new URL(req.url, 'http://localhost')
              codeId = u.searchParams.get('id') || u.searchParams.get('code')
            }
            if (!codeId) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ success: false, message: 'ID atau Kode wajib diisi.' }))
            }
            const deleted = deleteRegistrationCode(codeId)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: deleted }))
          })
          return
        }
      })

      // 1. Serving Berkas Upload di Dev Server
      server.middlewares.use('/uploads', (req, res, next) => {
        if (req.method !== 'GET') return next()
        let rawFileName = ''
        try {
          rawFileName = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0])
        } catch (e) {
          res.statusCode = 400
          return res.end('Invalid encoding')
        }
        if (rawFileName.includes('..') || rawFileName.includes('/') || rawFileName.includes('\\') || rawFileName.includes('\0')) {
          res.statusCode = 403
          return res.end('Forbidden')
        }
        const filePath = path.join(UPLOADS_DIR, path.basename(rawFileName))
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          return res.end('File not found')
        }
        const ext = path.extname(filePath).toLowerCase()
        const uploadMimes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.txt': 'text/plain; charset=utf-8'
        }
        res.setHeader('Content-Type', uploadMimes[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })

      // 2. Upload Berkas Endpoint di Dev Server
      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          try {
            const { fileName, fileData, tanggal, date } = JSON.parse(body)
            if (!fileData) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ success: false, error: 'File data required' }))
            }

            const tanggalReq = tanggal || date || ""
            const INDO_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
            let monthName = ""
            let yearNum = ""

            if (tanggalReq && typeof tanggalReq === "string") {
              const parts = tanggalReq.split("-")
              if (parts.length >= 2) {
                yearNum = parts[0]
                const mIdx = parseInt(parts[1], 10) - 1
                if (mIdx >= 0 && mIdx < 12) {
                  monthName = INDO_MONTHS[mIdx]
                }
              }
            }
            if (!monthName || !yearNum) {
              const now = new Date()
              monthName = INDO_MONTHS[now.getMonth()]
              yearNum = String(now.getFullYear())
            }

            const monthTag = `${monthName}_${yearNum}`
            const cleanName = path.basename(fileName || 'dokumen.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
            const baseNameWithMonth = cleanName.toLowerCase().includes(monthName.toLowerCase())
              ? cleanName
              : `${monthTag}_${cleanName}`

            const storedName = `${Date.now()}_${baseNameWithMonth}`
            const target = path.join(UPLOADS_DIR, storedName)
            const b64 = fileData.replace(/^data:[^;]+;base64,/, '')
            const buf = Buffer.from(b64, 'base64')
            fs.writeFileSync(target, buf)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              fileUrl: `/uploads/${storedName}`,
              relativeUrl: `/uploads/${storedName}`,
              fileName: baseNameWithMonth,
              storedName: storedName,
              fileSize: `${(buf.length / 1024).toFixed(0)} KB`
            }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
      })

      // 3. Endpoint Download Laporan Bulanan (.ZIP / .PDF) di Dev Server
      server.middlewares.use('/api/reports/zip', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        const u = new URL(req.url, 'http://localhost')
        const month = u.searchParams.get('month') || '07'
        const year = u.searchParams.get('year') || '2026'
        const userId = u.searchParams.get('userId') || ''
        const gdriveLink = u.searchParams.get('gdriveLink') || ''

        let storeData = { accounts: [], journals: [] }
        if (fs.existsSync(DB_FILE)) {
          try {
            storeData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
          } catch (e) {}
        }
        const targetUser = storeData.accounts?.find(a => a.id === userId || a.username === userId)
          || storeData.accounts?.find(a => a.role !== 'superadmin')
          || storeData.accounts?.[0]
          || { nama: 'Pegawai E-Kinerja', nip: '200011192025211007', pangkat: 'Pengatur Muda / II/a', jabatan: 'Staff', unitKerja: 'Instansi' }
        const userJournals = (storeData.journals || []).filter(j => !userId || j.userId === targetUser.id || j.userId === targetUser.username)

        try {
          const { zipBuffer, zipFileName } = await generateMonthlyReportZip({
            pegawai: targetUser,
            journals: userJournals,
            month,
            year,
            gdriveLink,
            uploadsDir: UPLOADS_DIR
          })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`)
          res.setHeader('Content-Length', zipBuffer.length)
          res.end(zipBuffer)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      server.middlewares.use('/api/reports/pdf', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        const u = new URL(req.url, 'http://localhost')
        const month = u.searchParams.get('month') || '07'
        const year = u.searchParams.get('year') || '2026'
        const userId = u.searchParams.get('userId') || ''
        const gdriveLink = u.searchParams.get('gdriveLink') || ''

        let storeData = { accounts: [], journals: [] }
        if (fs.existsSync(DB_FILE)) {
          try {
            storeData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
          } catch (e) {}
        }
        const targetUser = storeData.accounts?.find(a => a.id === userId || a.username === userId)
          || storeData.accounts?.find(a => a.role !== 'superadmin')
          || storeData.accounts?.[0]
          || { nama: 'Pegawai E-Kinerja', nip: '200011192025211007', pangkat: 'Pengatur Muda / II/a', jabatan: 'Staff', unitKerja: 'Instansi' }
        const userJournals = (storeData.journals || []).filter(j => !userId || j.userId === targetUser.id || j.userId === targetUser.username)

        try {
          const pdfBuffer = await generateMonthlyReportPdf({
            pegawai: targetUser,
            journals: userJournals,
            month,
            year,
            gdriveLink,
            uploadsDir: UPLOADS_DIR
          })
          const cleanName = (targetUser.nama || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_')
          const monthIndex = parseInt(month, 10) - 1
          const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
          const monthName = NAMA_BULAN[monthIndex] || 'Bulan'
          const filename = `Laporan_Kinerja_${monthName}_${year}_${cleanName}.pdf`

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.setHeader('Content-Length', pdfBuffer.length)
          res.end(pdfBuffer)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      server.middlewares.use('/api/sync', (req, res, next) => {
        if (req.method === 'GET') {
          let payload = { accounts: [], journals: [] }
          if (fs.existsSync(DB_FILE)) {
            try {
              payload = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
            } catch (e) {}
          }
          // Sanitasi akun (tidak bocorkan password)
          if (Array.isArray(payload.accounts)) {
            payload.accounts = payload.accounts.map(sanitizeUser)
          }
          payload.botConfig = getBotConfig()
          payload.aiConfig = getAiConfig()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body)
              let current = {}
              if (fs.existsSync(DB_FILE)) {
                try {
                  current = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
                } catch (e) {}
              }
              const merged = {
                ...current,
                ...incoming,
                updatedAt: new Date().toISOString()
              }
              // Gabungkan akun
              if (Array.isArray(incoming.accounts)) {
                const map = new Map((current.accounts || []).map(a => [a.id || a.username, a]))
                incoming.accounts.forEach(a => map.set(a.id || a.username, { ...map.get(a.id || a.username), ...a }))
                merged.accounts = Array.from(map.values())
              }
              // Gabungkan jurnal
              if (Array.isArray(incoming.journals)) {
                const jMap = new Map((current.journals || []).map(j => [j.id, j]))
                incoming.journals.forEach(j => jMap.set(j.id, { ...jMap.get(j.id), ...j }))
                merged.journals = Array.from(jMap.values())
              }

              // Pastikan direktori database ada
              const dbDir = path.dirname(DB_FILE)
              if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true })
              }

              fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, count: merged.accounts?.length }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === 'serve' ? apiSyncPlugin() : null
  ].filter(Boolean),
  define: {
    '__BOT_ENABLED_ENV__': JSON.stringify(Boolean((process.env.TELEGRAM_BOT_TOKEN || '').trim())),
    '__BOT_USERNAME_ENV__': JSON.stringify((process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim())
  }
}))
