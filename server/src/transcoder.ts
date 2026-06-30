import { spawn, type ChildProcess } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STREAMS_DIR = path.join(__dirname, '..', '.streams')
const IDLE_TIMEOUT_MS = 120_000
const OUTPUT_HEIGHT = 360

export interface TranscodeOptions {
  referrer?: string
  userAgent?: string
}

export interface SessionInfo {
  id: string
  url: string
  playlistUrl: string
  ready: boolean
  error: string | null
}

interface Session {
  id: string
  url: string
  process: ChildProcess | null
  outputDir: string
  playlistPath: string
  ready: boolean
  error: string | null
  lastAccess: number
  readyWatcher: ReturnType<typeof setInterval> | null
}

function buildFfmpegArgs(
  inputUrl: string,
  playlistPath: string,
  segmentPattern: string,
  options: TranscodeOptions,
): string[] {
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-fflags',
    '+genpts+discardcorrupt',
    '-probesize',
    '32M',
    '-analyzeduration',
    '5M',
  ]

  if (options.userAgent) {
    args.push('-user_agent', options.userAgent)
  }
  if (options.referrer) {
    args.push('-headers', `Referer: ${options.referrer}\r\n`)
  }

  args.push(
    '-i',
    inputUrl,
    '-vf',
    `scale=-2:${OUTPUT_HEIGHT}:flags=fast_bilinear`,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'zerolatency',
    '-b:v',
    '600k',
    '-maxrate',
    '800k',
    '-bufsize',
    '1200k',
    '-g',
    '48',
    '-keyint_min',
    '48',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-ac',
    '2',
    '-f',
    'hls',
    '-hls_time',
    '2',
    '-hls_list_size',
    '5',
    '-hls_flags',
    'delete_segments+append_list+omit_endlist',
    '-hls_segment_filename',
    segmentPattern,
    playlistPath,
  )

  return args
}

export class TranscodeManager {
  private sessions = new Map<string, Session>()
  private urlToSession = new Map<string, string>()
  private cleanupTimer: ReturnType<typeof setInterval>

  constructor() {
    fs.mkdirSync(STREAMS_DIR, { recursive: true })
    this.cleanupTimer = setInterval(() => this.cleanupIdle(), 30_000)
  }

  getFfmpegPath(): string | null {
    return ffmpegPath
  }

  start(url: string, options: TranscodeOptions = {}): SessionInfo {
    const existingId = this.urlToSession.get(url)
    if (existingId) {
      const existing = this.sessions.get(existingId)
      if (existing && existing.process && !existing.process.killed) {
        existing.lastAccess = Date.now()
        return this.toInfo(existing)
      }
    }

    if (!ffmpegPath) {
      throw new Error('FFmpeg introuvable — réinstallez les dépendances du serveur.')
    }

    const id = crypto.randomUUID()
    const outputDir = path.join(STREAMS_DIR, id)
    fs.mkdirSync(outputDir, { recursive: true })

    const playlistPath = path.join(outputDir, 'index.m3u8')
    const segmentPattern = path.join(outputDir, 'seg_%03d.ts')
    const args = buildFfmpegArgs(url, playlistPath, segmentPattern, options)

    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })

    const session: Session = {
      id,
      url,
      process: proc,
      outputDir,
      playlistPath,
      ready: false,
      error: null,
      lastAccess: Date.now(),
      readyWatcher: null,
    }

    session.readyWatcher = setInterval(() => {
      if (fs.existsSync(playlistPath)) {
        session.ready = true
        if (session.readyWatcher) {
          clearInterval(session.readyWatcher)
          session.readyWatcher = null
        }
      }
    }, 250)

    proc.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) console.error(`[ffmpeg:${id.slice(0, 8)}]`, msg)
    })

    proc.on('exit', (code) => {
      session.process = null
      if (session.readyWatcher) {
        clearInterval(session.readyWatcher)
        session.readyWatcher = null
      }
      if (code !== 0 && code !== null && !session.ready) {
        session.error = `Flux source inaccessible (code ${code})`
      }
    })

    this.sessions.set(id, session)
    this.urlToSession.set(url, id)

    return this.toInfo(session)
  }

  getStatus(id: string): SessionInfo | null {
    const session = this.sessions.get(id)
    if (!session) return null

    session.lastAccess = Date.now()
    if (!session.ready && fs.existsSync(session.playlistPath)) {
      session.ready = true
    }

    return this.toInfo(session)
  }

  stop(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return

    if (session.readyWatcher) clearInterval(session.readyWatcher)
    session.process?.kill('SIGTERM')
    this.urlToSession.delete(session.url)
    this.sessions.delete(id)
    fs.rmSync(session.outputDir, { recursive: true, force: true })
  }

  destroy(): void {
    clearInterval(this.cleanupTimer)
    for (const id of [...this.sessions.keys()]) {
      this.stop(id)
    }
  }

  private cleanupIdle(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccess > IDLE_TIMEOUT_MS) {
        console.log(`[transcode] session idle: ${id.slice(0, 8)}`)
        this.stop(id)
      }
    }
  }

  private toInfo(session: Session): SessionInfo {
    return {
      id: session.id,
      url: session.url,
      playlistUrl: `/streams/${session.id}/index.m3u8`,
      ready: session.ready && fs.existsSync(session.playlistPath),
      error: session.error,
    }
  }
}

export { STREAMS_DIR, OUTPUT_HEIGHT }
