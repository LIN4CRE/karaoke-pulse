<div align="center">

<img src="./assets/banner.png" alt="KaraokePulse Banner" width="100%" />

# 🎤 KaraokePulse — YouTube Karaoke Studio

### *Turn Any YouTube Song into a Live Karaoke Experience with Synced Lyrics, AI Vocal Removal, Live Mic Reverb & Pitch Detection*

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_Online-00f5d4?style=for-the-badge&logo=cloudflare&logoColor=black)](https://valuation-product-nelson-difference.trycloudflare.com)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-7209b7?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Multiband_DSP-f72585?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd166?style=for-the-badge)](LICENSE)

---

[**🌐 Live Studio**](https://valuation-product-nelson-difference.trycloudflare.com) &bull; [**🌟 Features**](#-features) &bull; [**🚀 Quickstart**](#-quickstart) &bull; [**🎹 Hotkeys**](#-keyboard-shortcuts) &bull; [**🛠️ Tech Stack**](#%EF%B8%8F-architecture--tech-stack)

</div>

---

## 🌟 Features

### 1. 🌟 Curated "Top Hits" with 100% Guaranteed Synced Lyrics
Never guess whether a song has lyrics. Includes 30+ pre-verified crowd favorites:
- 🎸 **Rock Anthems**: *Bohemian Rhapsody* (Queen), *Don't Stop Believin'* (Journey), *Livin' on a Prayer* (Bon Jovi), *Sweet Child O' Mine* (Guns N' Roses), *Hotel California* (Eagles), *Wonderwall* (Oasis), *Mr. Brightside* (The Killers), *In the End* (Linkin Park)
- 🎤 **Pop Legends**: *Cruel Summer* (Taylor Swift), *Rolling in the Deep* (Adele), *As It Was* (Harry Styles), *Flowers* (Miley Cyrus), *Blinding Lights* (The Weeknd), *Shape of You* (Ed Sheeran), *Bad Romance* (Lady Gaga), *Uptown Funk* (Bruno Mars)
- 🌟 **Classics & Crooners**: *Fly Me to the Moon* (Frank Sinatra), *My Way* (Frank Sinatra), *Can't Help Falling in Love* (Elvis Presley), *Let It Be* (The Beatles), *Hey Jude* (The Beatles), *Stand By Me* (Ben E. King), *Imagine* (John Lennon)
- 💃 **80s & 90s Party**: *I Wanna Dance with Somebody* (Whitney Houston), *Never Gonna Give You Up* (Rick Astley), *Take On Me* (a-ha), *Dancing Queen* (ABBA), *I Want It That Way* (Backstreet Boys), *Wannabe* (Spice Girls), *Billie Jean* (Michael Jackson)

### 2. 🎛️ Dual-Stem Multiband Vocal Reducer
- Unlike crude phase-cancellation tools that destroy bass and kick drums, KaraokePulse uses a **frequency-split filtergraph**:
  - `0 - 160 Hz`: Low-end sub-bass, 808s, and kick drums remain stereo and 100% punchy.
  - `160 - 20,000 Hz`: Center-channel vocals are attenuated while stereo instruments, guitars, synths, and reverbs remain wide.
- **Interactive Vocal Crossfader**: Seamlessly blend between `0%` (Pure Karaoke), `25%` (Guide Vocals), `50%` (Half Split), and `100%` (Original Track).

### 3. ✨ Animated Karaoke Lyrics Engine
- **Progressive Character / Word Fill**: Active lyric line fills with glowing neon in real-time as the line is sung.
- **Bouncing Ball Pulse**: Rides across the active words with bouncing animation.
- **Intro Countdown**: An arcade-style `3... 2... 1...` countdown banner appears before singing begins.
- **Seek-on-Click**: Click any lyric line to jump playback directly to that timestamp.
- **Sync Offset Micro-Tuner**: Fast buttons (`-0.5s` to `+0.5s`) for micro-adjusting lyrics sync on the fly.
- **Automatic Fallback to YouTube Captions**: If a track isn't on LRCLIB, YouTube's official captions are extracted and converted to synced LRC format.

### 4. 🎙️ Live Microphone, Karaoke Reverb & Pitch Detector
- Connect your microphone with one click.
- **Karaoke Reverb / Echo Slider**: Authentic lounge reverberation using algorithmic stereo feedback delay.
- **Autocorrelation Pitch Detector**: Identifies the musical note you are singing (e.g. `C4`, `G4`) with a glowing reactive vocal ring.

### 5. 🔴 Performance Take Recorder
- Record your voice mixed together with the karaoke instrumental track.
- Preview and download your recorded take (`.webm`).

### 6. 🎨 4 Aesthetic Themes & Stage Modes
- **Theme Picker**: *Cyberpunk Neon*, *Cosmic Violet*, *Sunset Gold*, *Tokyo Emerald*.
- **Stage Modes**: Toggle between **Neon Spectrum Equalizer** and a **3D Spinning Vinyl Record**.
- **Fullscreen Stage Mode**: Hook up to a TV or monitor for a true karaoke party.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/karaoke-pulse.git
cd karaoke-pulse

# 2. Install dependencies
npm install

# 3. Start KaraokePulse Studio
node server.js
```

Or on Windows, simply double-click:
```cmd
start-karaoke.bat
```

Open your browser at **http://localhost:3000** or visit the **[Live Deployment Link](https://valuation-product-nelson-difference.trycloudflare.com)**!

---

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Spacebar` | Play / Pause |
| `Left Arrow` | Rewind 5 seconds |
| `Right Arrow` | Fast forward 5 seconds |
| `Click on any Lyric` | Instantly jump song playback to that line |
| `⛶ Fullscreen` | Full-screen Party Stage mode |

---

## 🛠️ Architecture & Tech Stack

```
karaoke-pulse/
├── public/
│   ├── index.html       # Cyberpunk Karaoke UI
│   ├── style.css        # Responsive CSS3 with 4 themes & glowing animations
│   └── app.js           # Web Audio API engine, Pitch Detector & Lyric Sync
├── media/               # Cached audio stems and metadata
├── data/
│   ├── catalog.json     # 30+ Curated Top Hits with 100% verified lyrics
│   └── library.json     # Local user library
├── assets/
│   └── banner.png       # Cinematic Neon Studio Banner
├── server.js            # Node.js Express server + yt-dlp & FFmpeg pipeline
├── start-karaoke.bat    # 1-Click Windows Launcher
└── package.json
```

---

## 📄 License

MIT License &copy; 2026 KaraokePulse Contributors.
