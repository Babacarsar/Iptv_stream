import cors from 'cors'
import express from 'express'
import { OUTPUT_HEIGHT, STREAMS_DIR, TranscodeManager } from './transcoder.js'

const PORT = Number(process.env.PORT) || 3001
const manager = new TranscodeManager()

const app = express()
app.use(cors())
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ffmpeg: Boolean(manager.getFfmpegPath()),
    maxHeight: OUTPUT_HEIGHT,
  })
})

app.post('/api/start', (req, res) => {
  const { url, referrer, userAgent } = req.body ?? {}

  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'URL de flux invalide' })
    return
  }

  try {
    const session = manager.start(url, {
      referrer: typeof referrer === 'string' ? referrer : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    })
    res.json(session)
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur de transcodage',
    })
  }
})

app.get('/api/:sessionId/status', (req, res) => {
  const status = manager.getStatus(req.params.sessionId)
  if (!status) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  res.json(status)
})

app.delete('/api/:sessionId', (req, res) => {
  manager.stop(req.params.sessionId)
  res.json({ ok: true })
})

app.use(
  '/streams',
  express.static(STREAMS_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }),
)

app.listen(PORT, () => {
  console.log(`[transcode] Babacar Streaming proxy — port ${PORT}`)
  console.log(`[transcode] FFmpeg: ${manager.getFfmpegPath() ? 'OK' : 'MANQUANT'}`)
  console.log(`[transcode] Sortie: ${OUTPUT_HEIGHT}p HLS`)
})

process.on('SIGINT', () => {
  manager.destroy()
  process.exit(0)
})
