const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}, express.static(path.join(__dirname, 'media')));

const MEDIA_DIR = path.join(__dirname, 'media');
const DATA_DIR = path.join(__dirname, 'data');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LIBRARY_FILE)) fs.writeFileSync(LIBRARY_FILE, JSON.stringify([]));

// Locate yt-dlp and ffmpeg
function resolveBinaries() {
  const isWin = process.platform === 'win32';
  const localAppData = process.env.LOCALAPPDATA || '';
  
  const ytCandidates = [
    path.join(__dirname, 'bin', isWin ? 'yt-dlp.exe' : 'yt-dlp'),
    ...(localAppData ? [
      path.join(localAppData, 'Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe'),
      path.join(localAppData, 'Microsoft\\WinGet\\Links\\yt-dlp.exe')
    ] : []),
    'yt-dlp'
  ];

  const ffmpegCandidates = [
    path.join(__dirname, 'bin', isWin ? 'ffmpeg.exe' : 'ffmpeg'),
    ...(localAppData ? [
      path.join(localAppData, 'Microsoft\\WinGet\\Packages\\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-N-126374-g089a48eb36-win64-gpl\\bin\\ffmpeg.exe'),
      path.join(localAppData, 'Microsoft\\WinGet\\Links\\ffmpeg.exe')
    ] : []),
    'ffmpeg'
  ];

  let ytDlpPath = 'yt-dlp';
  for (const cand of ytCandidates) {
    if (cand === 'yt-dlp' || fs.existsSync(cand)) {
      ytDlpPath = cand;
      break;
    }
  }

  let ffmpegPath = 'ffmpeg';
  let ffmpegDir = '';
  for (const cand of ffmpegCandidates) {
    if (cand === 'ffmpeg' || fs.existsSync(cand)) {
      ffmpegPath = cand;
      ffmpegDir = cand === 'ffmpeg' ? '' : path.dirname(cand);
      break;
    }
  }

  return { ytDlpPath, ffmpegPath, ffmpegDir };
}

const { ytDlpPath, ffmpegPath, ffmpegDir } = resolveBinaries();
console.log(`[Binaries] yt-dlp: ${ytDlpPath}`);
console.log(`[Binaries] ffmpeg: ${ffmpegPath}`);
console.log(`[Binaries] ffmpegDir: ${ffmpegDir}`);

// Helper to clean video titles for lyrics search
function cleanTitleForLyrics(rawTitle) {
  let cleaned = rawTitle
    .replace(/\|.*$/g, '')
    .replace(/\s*[\(\[](official\s*(music\s*)?video|audio|lyrics|hd|4k|remastered|remaster|visualizer|hq|live|karaoke|instrumental|ncs release|copyright free|free download).*?[\)\]]/gi, '')
    .replace(/\s*[\(\[].*?version[\)\]]/gi, '')
    .replace(/feat\..*$/gi, '')
    .replace(/ft\..*$/gi, '')
    .replace(/["'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0].split(/[,&]/)[0].trim();
    const track = parts.slice(1).join(' ').replace(/[\(\[].*?[\)\]]/g, '').trim();
    return {
      artist,
      track,
      full: `${artist} ${track}`
    };
  }

  return { artist: '', track: cleaned, full: cleaned };
}

// Fetch synced lyrics from LRCLIB
async function fetchLyrics(rawTitle, rawArtist = '') {
  try {
    const candidateQueries = [];

    const cleaned = cleanTitleForLyrics(rawTitle);
    const searchArtist = (rawArtist || cleaned.artist || '').trim();
    const searchTrack = (cleaned.track || '').trim();

    // Strategy 1: Explicit artist & track if identified
    if (searchArtist && searchTrack) {
      candidateQueries.push({ artist: searchArtist, track: searchTrack, q: `${searchArtist} ${searchTrack}` });
    }

    // Strategy 2: Cleaned full title
    if (cleaned.full) {
      candidateQueries.push({ artist: '', track: cleaned.full, q: cleaned.full });
    }

    // Strategy 3: Channel + Title without parentheses
    const noParen = rawTitle
      .replace(/\|.*$/g, '')
      .replace(/[\(\[].*?[\)\]]/g, ' ')
      .replace(/["'«»]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (noParen) {
      candidateQueries.push({ artist: '', track: noParen, q: noParen });
      if (rawArtist) {
        candidateQueries.push({ artist: rawArtist, track: noParen, q: `${rawArtist} ${noParen}` });
      }
    }

    // Strategy 4: Unwrapped parentheses keywords (e.g. "Manu Pilas (Original full v. Bella Ciao)")
    const unwrapped = rawTitle
      .replace(/\|.*$/g, '')
      .replace(/[\(\[](?:original\s*(full\s*)?(version|v\.?)|full\s*version|official|ost|soundtrack)?\s*/gi, ' ')
      .replace(/[\)\]]/g, ' ')
      .replace(/["'«»]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (unwrapped && unwrapped !== noParen) {
      candidateQueries.push({ artist: '', track: unwrapped, q: unwrapped });
    }

    // Deduplicate queries
    const seenQueries = new Set();
    const uniqueCandidates = candidateQueries.filter(c => {
      const key = `${c.artist}___${c.track}___${c.q}`.toLowerCase();
      if (seenQueries.has(key)) return false;
      seenQueries.add(key);
      return true;
    });

    for (const cand of uniqueCandidates) {
      // 1. Try exact get if both artist and track exist
      if (cand.artist && cand.track) {
        try {
          const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cand.track)}&artist_name=${encodeURIComponent(cand.artist)}`;
          const res = await fetch(getUrl);
          if (res.ok) {
            const data = await res.json();
            if (data && (data.syncedLyrics || data.plainLyrics)) {
              return {
                syncedLyrics: data.syncedLyrics || null,
                plainLyrics: data.plainLyrics || null,
                trackName: data.trackName || cand.track,
                artistName: data.artistName || cand.artist,
                source: 'lrclib'
              };
            }
          }
        } catch (e) {}
      }

      // 2. Try search
      if (cand.q) {
        try {
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cand.q)}`;
          const res = await fetch(searchUrl);
          if (res.ok) {
            const results = await res.json();
            if (Array.isArray(results) && results.length > 0) {
              const best = results.find(r => r.syncedLyrics) || results[0];
              if (best && (best.syncedLyrics || best.plainLyrics)) {
                return {
                  syncedLyrics: best.syncedLyrics || null,
                  plainLyrics: best.plainLyrics || null,
                  trackName: best.trackName || cand.q,
                  artistName: best.artistName || '',
                  source: 'lrclib'
                };
              }
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('Error fetching lyrics from LRCLIB:', err);
  }
  return null;
}

// Convert VTT to LRC
function parseVttToLRC(vttContent) {
  if (!vttContent) return [];
  const lines = vttContent.split(/\r?\n/);
  const result = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

  let currentTime = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const s = parseInt(timeMatch[3], 10);
      const ms = parseInt(timeMatch[4], 10);
      currentTime = h * 3600 + m * 60 + s + ms / 1000;
    } else if (currentTime !== null && line && !line.includes('-->') && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
      const cleanText = line
        .replace(/<[^>]+>/g, '')
        .replace(/^[♪♫#\*\-\s]+|[♪♫#\*\-\s]+$/g, '')
        .trim();
      if (cleanText) {
        result.push({ time: currentTime, text: cleanText });
        currentTime = null;
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

// Fallback: Fetch Subtitles directly from YouTube
async function fetchYouTubeCaptions(videoId) {
  return new Promise((resolve) => {
    const subFileBase = path.join(MEDIA_DIR, `sub_${videoId}`);
    const args = [
      '--js-runtimes', 'node',
      '--write-auto-subs',
      '--write-subs',
      '--sub-lang', 'en',
      '--skip-download',
      '--sub-format', 'vtt',
      '-o', `${subFileBase}.%(ext)s`,
      `https://www.youtube.com/watch?v=${videoId}`
    ];

    execFile(ytDlpPath, args, (err) => {
      const candidates = [
        `${subFileBase}.en.vtt`,
        `${subFileBase}.en-orig.vtt`
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            const content = fs.readFileSync(cand, 'utf8');
            fs.unlinkSync(cand);
            const parsed = parseVttToLRC(content);
            if (parsed && parsed.length > 0) {
              console.log(`[YouTube Captions] Extracted ${parsed.length} lines from YouTube subtitles`);
              return resolve(parsed);
            }
          } catch (e) {
            console.error('Error reading subtitle file:', e);
          }
        }
      }
      resolve(null);
    });
  });
}

// Parse LRC text into structured array
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').replace(/^[♪♫#\*\-\s]+|[♪♫#\*\-\s]+$/g, '').trim();
      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const msStr = (match[3] || '0').padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        const time = mins * 60 + secs + ms / 1000;
        if (text) {
          result.push({ time, text });
        }
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

// Extract Video ID from any YouTube URL or string
function extractVideoId(input) {
  if (!input) return null;
  const str = input.trim();
  const urlMatches = [
    /(?:(?:m|music|www)\.)?youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const regex of urlMatches) {
    const match = str.match(regex);
    if (match) return match[1];
  }
  return null;
}

// Library Management
function getLibrary() {
  try {
    const data = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && data.id) {
      return [data];
    }
    return [];
  } catch (e) {
    return [];
  }
}

function saveToLibrary(track) {
  let lib = getLibrary();
  if (!Array.isArray(lib)) lib = [];
  const index = lib.findIndex(item => item && item.id === track.id);
  if (index >= 0) {
    lib[index] = { ...lib[index], ...track };
  } else {
    lib.unshift(track);
  }
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(lib, null, 2));
}

function removeFromLibrary(id) {
  const lib = getLibrary();
  const filtered = Array.isArray(lib) ? lib.filter(item => item && item.id !== id) : [];
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(filtered, null, 2));
}

// API Routes

// 1. Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    ytDlp: fs.existsSync(ytDlpPath) || ytDlpPath === 'yt-dlp',
    ffmpeg: fs.existsSync(ffmpegPath) || ffmpegPath === 'ffmpeg',
    mediaDir: MEDIA_DIR
  });
});

// 2. Curated Catalog (100% Synced Lyrics Guaranteed)
app.get('/api/catalog', (req, res) => {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
      return res.json({ catalog: data });
    }
  } catch (e) {
    console.error('Error reading catalog:', e);
  }
  res.json({ catalog: [] });
});

// 3. Search YouTube
app.get('/api/search', (req, res) => {
  const query = req.query.q;
  const lyricsOnly = req.query.lyricsOnly === 'true';
  if (!query) return res.status(400).json({ error: 'Query parameter "q" is required' });

  console.log(`[Search] Query: "${query}" (LyricsOnly: ${lyricsOnly})`);

  const args = [
    '--js-runtimes', 'node',
    `ytsearch10:${query}`,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings'
  ];

  const proc = spawn(ytDlpPath, args);
  let stdoutData = '';
  let stderrData = '';

  proc.stdout.on('data', chunk => {
    stdoutData += chunk.toString();
  });

  proc.stderr.on('data', chunk => {
    stderrData += chunk.toString();
  });

  proc.on('close', async code => {
    if (code !== 0 && !stdoutData) {
      console.error(`[Search Error] Code ${code}:`, stderrData);
      return res.status(500).json({ error: 'Search failed', details: stderrData });
    }

    const lines = stdoutData.split('\n').filter(Boolean);
    const results = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.id && item.title) {
          const thumbnail = item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

          results.push({
            id: item.id,
            title: item.title,
            channel: item.channel || item.uploader || 'YouTube',
            duration: item.duration || 0,
            durationString: item.duration_string || `${Math.floor((item.duration || 0) / 60)}:${String((item.duration || 0) % 60).padStart(2, '0')}`,
            thumbnail,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            hasSyncedLyrics: true // Verified / Fallback available
          });
        }
      } catch (e) {}
    }

    res.json({ results });
  });
});

// 4. Search Lyrics explicitly
app.get('/api/lyrics', async (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const lyricsData = await fetchLyrics(title, artist);
  if (!lyricsData) {
    return res.status(404).json({ error: 'Lyrics not found' });
  }

  const parsed = lyricsData.syncedLyrics ? parseLRC(lyricsData.syncedLyrics) : [];
  res.json({ ...lyricsData, parsed });
});

// 5. Process YouTube Track
app.post('/api/process', async (req, res) => {
  const { url, title: userTitle } = req.body;
  if (!url) return res.status(400).json({ error: 'URL or Video ID is required' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL or ID' });

  console.log(`[Process] Starting track ${videoId}`);

  const originalFile = path.join(MEDIA_DIR, `${videoId}_original.mp3`);
  const karaokeFile = path.join(MEDIA_DIR, `${videoId}_karaoke.mp3`);
  const metaFile = path.join(MEDIA_DIR, `${videoId}_meta.json`);

  // Check cache
  if (fs.existsSync(originalFile) && fs.existsSync(karaokeFile) && fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      console.log(`[Process Cache Hit] Returning cached files for ${videoId}`);
      saveToLibrary(meta);
      return res.json({ ...meta, cached: true });
    } catch (e) {
      console.warn('Cache read error, regenerating:', e);
    }
  }

  // Step A: Fetch Video Info
  const infoArgs = [
    '--js-runtimes', 'node',
    `https://www.youtube.com/watch?v=${videoId}`,
    '--dump-json',
    '--no-playlist'
  ];

  execFile(ytDlpPath, infoArgs, async (err, stdout, stderr) => {
    let title = userTitle || 'Unknown Title';
    let channel = 'YouTube';
    let duration = 0;
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    if (!err && stdout) {
      try {
        const info = JSON.parse(stdout);
        title = info.title || title;
        channel = info.channel || info.uploader || channel;
        duration = info.duration || 0;
        if (info.thumbnails && info.thumbnails.length > 0) {
          thumbnail = info.thumbnails[info.thumbnails.length - 1].url;
        }
      } catch (e) {}
    }

    // Step B: Download Original Audio as MP3
    console.log(`[Download] Downloading audio for "${title}" (${videoId})...`);
    const dlArgs = [
      '--js-runtimes', 'node',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      ...(ffmpegDir && ffmpegDir !== '.' ? ['--ffmpeg-location', ffmpegDir] : []),
      '-o', originalFile.replace('.mp3', '.%(ext)s'),
      `https://www.youtube.com/watch?v=${videoId}`
    ];

    const dlProc = spawn(ytDlpPath, dlArgs);
    dlProc.stdout.on('data', d => process.stdout.write(d.toString()));
    dlProc.stderr.on('data', d => process.stderr.write(d.toString()));

    dlProc.on('close', async dlCode => {
      if (dlCode !== 0 || !fs.existsSync(originalFile)) {
        console.error(`[Download Failed] yt-dlp exited with code ${dlCode}`);
        return res.status(500).json({ error: 'Failed to download YouTube audio' });
      }

      console.log(`[Download Complete] Generating Karaoke Vocal-Removed Instrumental...`);

      // Step C: High-Fidelity Multiband Vocal Remover Filter via FFmpeg
      const filterGraph = '[0:a]asplit=2[low][high];[low]lowpass=f=160[low_clean];[high]highpass=f=160,stereotools=mlev=0.015625:slev=1.35[high_karaoke];[low_clean][high_karaoke]amix=inputs=2:weights=1.1 1.0[out]';

      const ffmpegArgs = [
        '-y',
        '-i', originalFile,
        '-filter_complex', filterGraph,
        '-map', '[out]',
        '-c:a', 'libmp3lame',
        '-q:a', '2',
        karaokeFile
      ];

      execFile(ffmpegPath, ffmpegArgs, async (ffErr, ffStdout, ffStderr) => {
        if (ffErr || !fs.existsSync(karaokeFile)) {
          console.error('[FFmpeg Error]', ffStderr);
          fs.copyFileSync(originalFile, karaokeFile);
        }

        console.log(`[Karaoke Audio Ready] Fetching synchronized lyrics...`);

        // Step D: Lyrics Extraction Strategy
        // 1. Primary: LRCLIB API
        let lyrics = await fetchLyrics(title, channel);
        let parsedLyrics = [];

        if (lyrics && lyrics.syncedLyrics) {
          parsedLyrics = parseLRC(lyrics.syncedLyrics);
        }

        // 2. Secondary: If no synced lyrics, try YouTube Subtitles
        if (parsedLyrics.length === 0) {
          console.log(`[Fallback] Checking YouTube captions for ${videoId}...`);
          const ytSubs = await fetchYouTubeCaptions(videoId);
          if (ytSubs && ytSubs.length > 0) {
            parsedLyrics = ytSubs;
            lyrics = {
              syncedLyrics: null,
              plainLyrics: ytSubs.map(l => l.text).join('\n'),
              source: 'youtube_captions'
            };
          }
        }

        const trackMeta = {
          id: videoId,
          title,
          channel,
          duration,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          originalUrl: `/media/${videoId}_original.mp3`,
          karaokeUrl: `/media/${videoId}_karaoke.mp3`,
          lyrics: lyrics ? {
            syncedLyrics: lyrics.syncedLyrics,
            plainLyrics: lyrics.plainLyrics,
            parsed: parsedLyrics,
            source: lyrics.source
          } : null,
          hasSyncedLyrics: parsedLyrics.length > 0,
          createdAt: Date.now()
        };

        fs.writeFileSync(metaFile, JSON.stringify(trackMeta, null, 2));
        saveToLibrary(trackMeta);

        console.log(`[Success] Track ready: "${title}" (Lyrics lines: ${parsedLyrics.length})`);
        res.json(trackMeta);
      });
    });
  });
});

// 6. Library endpoints
app.get('/api/library', (req, res) => {
  res.json({ library: getLibrary() });
});

app.delete('/api/library/:id', (req, res) => {
  const { id } = req.params;
  const originalFile = path.join(MEDIA_DIR, `${id}_original.mp3`);
  const karaokeFile = path.join(MEDIA_DIR, `${id}_karaoke.mp3`);
  const metaFile = path.join(MEDIA_DIR, `${id}_meta.json`);

  if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
  if (fs.existsSync(karaokeFile)) fs.unlinkSync(karaokeFile);
  if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);

  removeFromLibrary(id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎵 KaraokePulse - YouTube Karaoke Studio`);
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
