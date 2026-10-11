// =========================================================
// KaraokePulse - Next-Gen Interactive Karaoke Engine
// =========================================================

class KaraokeEngine {
  constructor() {
    this.currentTrack = null;
    this.lyrics = [];
    this.currentLyricIndex = -1;
    this.syncOffset = 0; // seconds
    this.isPlaying = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.catalogData = [];
    this.currentGenre = 'all';

    // Stage view modes: 'equalizer', 'vinyl'
    this.stageMode = 'equalizer';

    // Audio Context & Web Audio Nodes
    this.audioCtx = null;
    this.karaokeSource = null;
    this.originalSource = null;
    this.karaokeGain = null;
    this.originalGain = null;
    this.masterGain = null;
    this.analyser = null;

    // Microphone & Reverb Nodes
    this.micStream = null;
    this.micSource = null;
    this.micGain = null;
    this.micMaster = null;
    this.reverbDelay = null;
    this.reverbFeedback = null;
    this.reverbFilter = null;
    this.reverbGain = null;
    this.micAnalyser = null;
    this.isMicActive = false;

    // Recording Destination
    this.recordDestination = null;

    // Pitch detection
    this.pitchDetectorRunning = false;
    this.noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // DOM Elements
    this.dom = {
      appContainer: document.getElementById('appContainer'),
      karaokeAudio: document.getElementById('karaokeAudio'),
      originalAudio: document.getElementById('originalAudio'),

      // Theme & Header
      themeSelect: document.getElementById('themeSelect'),
      stageModeBtn: document.getElementById('stageModeBtn'),
      stageModeText: document.getElementById('stageModeText'),
      fullscreenBtn: document.getElementById('fullscreenBtn'),

      // Tabs & Navigation
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabPanes: document.querySelectorAll('.tab-pane'),

      // Catalog Tab
      catalogList: document.getElementById('catalogList'),
      genreChips: document.querySelectorAll('.genre-chip'),

      // Search Tab
      searchForm: document.getElementById('searchForm'),
      searchInput: document.getElementById('searchInput'),
      searchResults: document.getElementById('searchResults'),
      quickChips: document.querySelectorAll('.chip-btn'),
      lyricsOnlyFilter: document.getElementById('lyricsOnlyFilter'),

      // URL Tab
      urlInput: document.getElementById('urlInput'),
      urlSubmitBtn: document.getElementById('urlSubmitBtn'),

      // Library Tab
      libraryList: document.getElementById('libraryList'),
      refreshLibraryBtn: document.getElementById('refreshLibraryBtn'),

      // Processing Modal
      processingCard: document.getElementById('processingCard'),
      processingTitle: document.getElementById('processingTitle'),
      processingDetail: document.getElementById('processingDetail'),

      // Stage & Banner
      trackThumb: document.getElementById('trackThumb'),
      vinylDisc: document.getElementById('vinylDisc'),
      currentTrackTitle: document.getElementById('currentTrackTitle'),
      currentTrackArtist: document.getElementById('currentTrackArtist'),
      lyricsStatusPill: document.getElementById('lyricsStatusPill'),
      lyricsViewport: document.getElementById('lyricsViewport'),
      lyricsLines: document.getElementById('lyricsLines'),
      visualizerCanvas: document.getElementById('visualizerCanvas'),
      detectedPitchNote: document.getElementById('detectedPitchNote'),
      pitchPulseRing: document.getElementById('pitchPulseRing'),
      pitchStatus: document.getElementById('pitchStatus'),
      countdownOverlay: document.getElementById('countdownOverlay'),
      countdownNumber: document.getElementById('countdownNumber'),

      // Sync Controls
      syncMinusHalf: document.getElementById('syncMinusHalf'),
      syncMinusTenth: document.getElementById('syncMinusTenth'),
      syncDisplay: document.getElementById('currentSyncOffset'),
      syncPlusTenth: document.getElementById('syncPlusTenth'),
      syncPlusHalf: document.getElementById('syncPlusHalf'),
      syncReset: document.getElementById('syncReset'),
      manualLyricsBtn: document.getElementById('manualLyricsBtn'),

      // Scrubber & Transport
      scrubberWrap: document.getElementById('scrubberWrap'),
      scrubberFill: document.getElementById('scrubberFill'),
      scrubberThumb: document.getElementById('scrubberThumb'),
      currentTimeDisplay: document.getElementById('currentTimeDisplay'),
      totalTimeDisplay: document.getElementById('totalTimeDisplay'),
      masterVolumeSlider: document.getElementById('masterVolumeSlider'),
      masterMuteBtn: document.getElementById('masterMuteBtn'),
      masterVolVal: document.getElementById('masterVolVal'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      playPauseIcon: document.getElementById('playPauseIcon'),
      skipBackBtn: document.getElementById('skipBackBtn'),
      skipForwardBtn: document.getElementById('skipForwardBtn'),
      restartBtn: document.getElementById('restartBtn'),

      // Studio Modules
      vocalSlider: document.getElementById('vocalSlider'),
      vocalLevelDisplay: document.getElementById('vocalLevelDisplay'),
      vocalPresets: document.querySelectorAll('.preset-btn'),

      micToggleBtn: document.getElementById('micToggleBtn'),
      micStatusText: document.getElementById('micStatusText'),
      micVolumeSlider: document.getElementById('micVolumeSlider'),
      micVolVal: document.getElementById('micVolVal'),
      reverbSlider: document.getElementById('reverbSlider'),
      reverbVal: document.getElementById('reverbVal'),

      pitchDownBtn: document.getElementById('pitchDownBtn'),
      pitchUpBtn: document.getElementById('pitchUpBtn'),
      keySemitones: document.getElementById('keySemitones'),
      playbackSpeedSelect: document.getElementById('playbackSpeedSelect'),

      // Modals
      recordToggleBtn: document.getElementById('recordToggleBtn'),
      recordingModal: document.getElementById('recordingModal'),
      recordedAudioPlayer: document.getElementById('recordedAudioPlayer'),
      downloadRecordingBtn: document.getElementById('downloadRecordingBtn'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      dismissModalBtn: document.getElementById('dismissModalBtn'),

      lyricsEditModal: document.getElementById('lyricsEditModal'),
      customLyricsInput: document.getElementById('customLyricsInput'),
      saveCustomLyricsBtn: document.getElementById('saveCustomLyricsBtn'),
      closeLyricsModalBtn: document.getElementById('closeLyricsModalBtn'),
      cancelCustomLyricsBtn: document.getElementById('cancelCustomLyricsBtn')
    };

    this.initAudioContext();
    this.initEventListeners();
    this.initVisualizer();
    this.loadCatalog();
    this.loadLibrary();
  }

  // 1. Initialize Web Audio Graph
  initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContext();

    // Destination for recordings
    this.recordDestination = this.audioCtx.createMediaStreamDestination();

    // Master bus
    this.masterGain = this.audioCtx.createGain();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.masterGain.connect(this.recordDestination);

    // Track Sources & Gains
    this.karaokeGain = this.audioCtx.createGain();
    this.originalGain = this.audioCtx.createGain();

    this.karaokeSource = this.audioCtx.createMediaElementSource(this.dom.karaokeAudio);
    this.originalSource = this.audioCtx.createMediaElementSource(this.dom.originalAudio);

    this.karaokeSource.connect(this.karaokeGain);
    this.originalSource.connect(this.originalGain);

    this.karaokeGain.connect(this.masterGain);
    this.originalGain.connect(this.masterGain);

    // Initial mix: 100% Karaoke, 0% Original
    this.updateVocalMix(0);
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // 2. Microphone & Reverb Setup
  async toggleMicrophone() {
    this.ensureAudioContext();

    if (this.isMicActive) {
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }
      this.isMicActive = false;
      this.pitchDetectorRunning = false;
      this.dom.micToggleBtn.classList.remove('active-mic');
      this.dom.micToggleBtn.querySelector('.btn-text').textContent = 'Mic: Off';
      this.dom.micStatusText.textContent = 'Off';
      this.dom.detectedPitchNote.textContent = '--';
      this.dom.pitchPulseRing.classList.remove('active');
      this.dom.pitchStatus.textContent = 'Mic inactive';
      return;
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micGain = this.audioCtx.createGain();
      this.micMaster = this.audioCtx.createGain();

      this.micAnalyser = this.audioCtx.createAnalyser();
      this.micAnalyser.fftSize = 2048;

      // Studio Reverb
      this.reverbDelay = this.audioCtx.createDelay(1.0);
      this.reverbDelay.delayTime.value = 0.16;

      this.reverbFeedback = this.audioCtx.createGain();
      this.reverbFeedback.gain.value = 0.42;

      this.reverbFilter = this.audioCtx.createBiquadFilter();
      this.reverbFilter.type = 'lowpass';
      this.reverbFilter.frequency.value = 3200;

      this.reverbGain = this.audioCtx.createGain();

      // Connect dry mic
      this.micSource.connect(this.micGain);
      this.micGain.connect(this.micMaster);
      this.micGain.connect(this.micAnalyser);

      // Connect wet reverb loop
      this.micGain.connect(this.reverbDelay);
      this.reverbDelay.connect(this.reverbFilter);
      this.reverbFilter.connect(this.reverbFeedback);
      this.reverbFeedback.connect(this.reverbDelay);

      this.reverbFilter.connect(this.reverbGain);
      this.reverbGain.connect(this.micMaster);

      // Output to speakers & recorder
      this.micMaster.connect(this.audioCtx.destination);
      this.micMaster.connect(this.recordDestination);

      this.updateMicVolume();
      this.updateReverbLevel();

      this.isMicActive = true;
      this.pitchDetectorRunning = true;
      this.startPitchDetection();

      this.dom.micToggleBtn.classList.add('active-mic');
      this.dom.micToggleBtn.querySelector('.btn-text').textContent = 'Mic: Live 🎤';
      this.dom.micStatusText.textContent = 'Live';
      this.dom.pitchStatus.textContent = 'Listening...';
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone: ' + err.message);
    }
  }

  updateMicVolume() {
    if (!this.micGain) return;
    const val = parseFloat(this.dom.micVolumeSlider.value) / 100;
    this.micGain.gain.setValueAtTime(val, this.audioCtx.currentTime);
    this.dom.micVolVal.textContent = `${this.dom.micVolumeSlider.value}%`;
  }

  updateReverbLevel() {
    if (!this.reverbGain) return;
    const val = parseFloat(this.dom.reverbSlider.value) / 100;
    this.reverbGain.gain.setValueAtTime(val * 0.85, this.audioCtx.currentTime);
    this.dom.reverbVal.textContent = `${this.dom.reverbSlider.value}%`;
  }

  // 3. Pitch Detection (Autocorrelation)
  startPitchDetection() {
    const buffer = new Float32Array(2048);

    const checkPitch = () => {
      if (!this.pitchDetectorRunning || !this.micAnalyser) return;

      this.micAnalyser.getFloatTimeDomainData(buffer);
      const pitch = this.autoCorrelate(buffer, this.audioCtx.sampleRate);

      if (pitch === -1) {
        this.dom.detectedPitchNote.textContent = '--';
        this.dom.pitchPulseRing.classList.remove('active');
        this.dom.pitchStatus.textContent = 'Sing note...';
      } else {
        const midi = Math.round(12 * (Math.log2(pitch / 440)) + 69);
        const noteName = this.noteStrings[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        this.dom.detectedPitchNote.textContent = `${noteName}${octave}`;
        this.dom.pitchPulseRing.classList.add('active');
        this.dom.pitchStatus.textContent = `${Math.round(pitch)} Hz`;
      }

      requestAnimationFrame(checkPitch);
    };

    checkPitch();
  }

  autoCorrelate(buf, sampleRate) {
    let size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.015) return -1;

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    }

    buf = buf.slice(r1, r2);
    size = buf.length;

    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  setMasterVolume(val) {
    const norm = Math.max(0, Math.min(100, val)) / 100;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(norm, this.audioCtx.currentTime);
    }
    if (this.dom.masterVolumeSlider) this.dom.masterVolumeSlider.value = val;
    if (this.dom.masterVolVal) this.dom.masterVolVal.textContent = `${val}%`;
    if (this.dom.masterMuteBtn) {
      this.dom.masterMuteBtn.textContent = val === 0 ? '🔇' : (val < 50 ? '🔉' : '🔊');
    }
  }

  // 4. Vocal Mix Crossfader
  updateVocalMix(vocalPercent) {
    const norm = vocalPercent / 100;
    const kGain = Math.cos(norm * 0.5 * Math.PI);
    const oGain = Math.sin(norm * 0.5 * Math.PI);

    if (this.karaokeGain && this.originalGain) {
      const now = this.audioCtx.currentTime;
      this.karaokeGain.gain.setValueAtTime(kGain, now);
      this.originalGain.gain.setValueAtTime(oGain, now);
    }

    if (vocalPercent === 0) {
      this.dom.vocalLevelDisplay.textContent = '0% (Pure Karaoke)';
    } else if (vocalPercent === 100) {
      this.dom.vocalLevelDisplay.textContent = '100% (Original Track)';
    } else {
      this.dom.vocalLevelDisplay.textContent = `${vocalPercent}% (Guide Vocals)`;
    }

    this.dom.vocalPresets.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.vocal, 10) === vocalPercent);
    });
  }

  // 5. Curated Catalog Loading
  async loadCatalog() {
    try {
      const res = await fetch('/api/catalog');
      const data = await res.json();
      this.catalogData = data.catalog || [];
      this.renderCatalog(this.catalogData);
    } catch (e) {
      console.error('Error fetching catalog:', e);
    }
  }

  renderCatalog(items) {
    const filtered = this.currentGenre === 'all'
      ? items
      : items.filter(i => i.genre.toLowerCase() === this.currentGenre.toLowerCase());

    if (!filtered || filtered.length === 0) {
      this.dom.catalogList.innerHTML = `<div class="empty-state"><p>No songs found in this category.</p></div>`;
      return;
    }

    this.dom.catalogList.innerHTML = '';
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <div class="card-thumb-wrap">
          <img src="${item.thumbnail}" class="card-thumb" alt="${item.title}" />
        </div>
        <div class="card-info">
          <div class="card-title">${item.title}</div>
          <div class="card-channel">${item.artist} &bull; ${item.durationString}</div>
          <div class="card-meta">
            <span class="card-badge-lyrics">✓ Synced Lyrics</span>
            <span class="card-badge-genre">${item.genre}</span>
          </div>
        </div>
        <button class="card-sing-btn">Sing 🎤</button>
      `;

      card.addEventListener('click', () => {
        const url = `https://www.youtube.com/watch?v=${item.id}`;
        this.processTrack(url, `${item.artist} - ${item.title}`);
      });

      this.dom.catalogList.appendChild(card);
    });
  }

  // 6. Track Processing & Loading
  async processTrack(url, userTitle = '') {
    this.ensureAudioContext();
    this.showProcessing(true, 'Extracting & Separating Track...', 'Downloading audio stems and synchronizing lyrics');

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title: userTitle })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process track');
      }

      const track = await res.json();
      console.log('Processed track ready:', track);
      this.loadTrack(track);
      this.loadLibrary();
    } catch (err) {
      console.error('Track processing error:', err);
      alert('Error loading YouTube track: ' + err.message);
    } finally {
      this.showProcessing(false);
    }
  }

  loadTrack(track, autoPlay = true) {
    this.currentTrack = track;
    this.dom.currentTrackTitle.textContent = track.title;
    this.dom.currentTrackArtist.textContent = track.channel || 'YouTube';
    if (track.thumbnail) {
      this.dom.trackThumb.src = track.thumbnail;
    }

    // Set audio sources
    this.dom.karaokeAudio.src = track.karaokeUrl;
    this.dom.originalAudio.src = track.originalUrl;

    // Load lyrics
    this.lyrics = [];
    this.currentLyricIndex = -1;
    this.syncOffset = 0;
    this.dom.syncDisplay.textContent = '0.0s';

    if (track.lyrics && track.lyrics.parsed && track.lyrics.parsed.length > 0) {
      this.lyrics = track.lyrics.parsed;
      this.dom.lyricsStatusPill.textContent = '✓ Synced Lyrics Ready';
      this.dom.lyricsStatusPill.className = 'lyrics-badge verified';
    } else {
      this.dom.lyricsStatusPill.textContent = '✏️ Custom Lyrics Mode';
      this.dom.lyricsStatusPill.className = 'lyrics-badge';
    }

    this.renderLyrics();

    // Reset playback
    this.pause();
    this.seek(0);
    if (autoPlay) {
      this.play();
    }
  }

  renderLyrics() {
    this.dom.lyricsLines.innerHTML = '';

    if (!this.lyrics || this.lyrics.length === 0) {
      this.dom.lyricsLines.innerHTML = `
        <div class="lyric-line placeholder">
          No synchronized lyrics found for this track.<br>
          Click <strong>"✏️ Edit / Paste Lyrics"</strong> below to paste your own!
        </div>
      `;
      return;
    }

    this.lyrics.forEach((line, index) => {
      const el = document.createElement('div');
      el.className = 'lyric-line';
      el.dataset.index = index;
      el.dataset.time = line.time;
      el.textContent = line.text;

      // Click to seek directly to this line
      el.addEventListener('click', () => {
        this.seek(line.time - this.syncOffset);
      });

      this.dom.lyricsLines.appendChild(el);
    });
  }

  updateLyrics(currentTime) {
    if (!this.lyrics || this.lyrics.length === 0) return;

    const adjustedTime = currentTime + this.syncOffset;

    // Check if we are right before the first line for countdown
    const firstLineTime = this.lyrics[0].time;
    const timeDiff = firstLineTime - adjustedTime;
    if (timeDiff > 0.5 && timeDiff <= 3.5) {
      const count = Math.ceil(timeDiff);
      this.dom.countdownNumber.textContent = count;
      this.dom.countdownOverlay.classList.remove('hidden');
    } else {
      this.dom.countdownOverlay.classList.add('hidden');
    }

    // Find the latest lyric line that has started
    let activeIdx = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (this.lyrics[i].time <= adjustedTime) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== this.currentLyricIndex) {
      this.currentLyricIndex = activeIdx;

      const allLines = this.dom.lyricsLines.children;
      for (let i = 0; i < allLines.length; i++) {
        if (i === activeIdx) {
          allLines[i].classList.add('active');
          allLines[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          allLines[i].classList.remove('active');
          allLines[i].style.removeProperty('--line-progress');
        }
      }
    }

    // Progressive fill calculation for active line
    if (activeIdx >= 0 && activeIdx < this.lyrics.length) {
      const curLine = this.lyrics[activeIdx];
      const nextLine = this.lyrics[activeIdx + 1];
      const lineDuration = nextLine ? (nextLine.time - curLine.time) : 4.0;
      const elapsed = adjustedTime - curLine.time;
      const progress = Math.min(100, Math.max(0, (elapsed / Math.min(lineDuration, 8.0)) * 100));
      const activeEl = this.dom.lyricsLines.children[activeIdx];
      if (activeEl) {
        activeEl.style.setProperty('--line-progress', `${progress.toFixed(1)}%`);
      }
    }
  }

  // 7. Playback Transport
  play() {
    this.ensureAudioContext();
    const p1 = this.dom.karaokeAudio.play();
    const p2 = this.dom.originalAudio.play();

    Promise.all([p1, p2]).then(() => {
      this.isPlaying = true;
      this.dom.playPauseIcon.textContent = '⏸';
      this.dom.vinylDisc.classList.add('spinning');
    }).catch(err => {
      console.warn('Audio play pending user interaction:', err);
    });
  }

  pause() {
    this.dom.karaokeAudio.pause();
    this.dom.originalAudio.pause();
    this.isPlaying = false;
    this.dom.playPauseIcon.textContent = '▶';
    this.dom.vinylDisc.classList.remove('spinning');
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    const maxDur = this.dom.karaokeAudio.duration || 0;
    const clamped = Math.max(0, Math.min(seconds, maxDur));
    this.dom.karaokeAudio.currentTime = clamped;
    this.dom.originalAudio.currentTime = clamped;
    this.updateScrubber();
    this.updateLyrics(clamped);
  }

  updateScrubber() {
    const cur = this.dom.karaokeAudio.currentTime || 0;
    const dur = this.dom.karaokeAudio.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;

    this.dom.scrubberFill.style.width = `${pct}%`;
    this.dom.scrubberThumb.style.left = `${pct}%`;
    this.dom.currentTimeDisplay.textContent = this.formatTime(cur);
    this.dom.totalTimeDisplay.textContent = this.formatTime(dur);
  }

  formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // 8. Performance Recording
  toggleRecording() {
    this.ensureAudioContext();

    if (this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.dom.recordToggleBtn.classList.remove('recording');
      this.dom.recordToggleBtn.querySelector('.btn-text').textContent = 'Record Take';
      return;
    }

    if (!this.isMicActive) {
      this.toggleMicrophone().then(() => {
        this.startRecorder();
      });
    } else {
      this.startRecorder();
    }
  }

  startRecorder() {
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recordDestination.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        this.dom.recordedAudioPlayer.src = audioUrl;
        this.dom.recordingModal.classList.remove('hidden');

        this.dom.downloadRecordingBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = `Karaoke_${(this.currentTrack ? this.currentTrack.title : 'Take')}.webm`;
          a.click();
        };
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.dom.recordToggleBtn.classList.add('recording');
      this.dom.recordToggleBtn.querySelector('.btn-text').textContent = '⏹ Stop Take';

      if (!this.isPlaying) {
        this.play();
      }
    } catch (e) {
      console.error('Error starting MediaRecorder:', e);
      alert('Could not start recording: ' + e.message);
    }
  }

  // 9. Visualizer Canvas Loop
  initVisualizer() {
    const canvas = this.dom.visualizerCanvas;
    const ctx = canvas.getContext('2d');
    let width, height;

    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const freqData = new Uint8Array(128);

    const draw = () => {
      requestAnimationFrame(draw);
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(freqData);

      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount;
      const centerY = height;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * 2] || 0;
        const barHeight = (val / 255) * height * 0.75;

        const x = i * barWidth;
        const y = centerY - barHeight;

        const grad = ctx.createLinearGradient(0, centerY, 0, y);
        grad.addColorStop(0, 'rgba(247, 37, 133, 0.15)');
        grad.addColorStop(0.5, 'rgba(114, 9, 183, 0.45)');
        grad.addColorStop(1, 'rgba(0, 245, 212, 0.85)');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

        // Peak point
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(x + 2, y - 3, barWidth - 4, 2);
      }
    };

    draw();
  }

  // 10. Library & Search
  async loadLibrary() {
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      const items = data.library || [];
      this.renderLibrary(items);
      // Auto preload first song in library if no track is active
      if (!this.currentTrack && items.length > 0) {
        this.loadTrack(items[0], false);
      }
    } catch (e) {
      console.error('Error fetching library:', e);
    }
  }

  renderLibrary(items) {
    if (!items || items.length === 0) {
      this.dom.libraryList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📁</span>
          <p>No saved songs yet. Choose a song from Top Hits or search above!</p>
        </div>
      `;
      return;
    }

    this.dom.libraryList.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <div class="card-thumb-wrap">
          <img src="${item.thumbnail}" class="card-thumb" alt="${item.title}" />
        </div>
        <div class="card-info">
          <div class="card-title">${item.title}</div>
          <div class="card-channel">${item.channel}</div>
          <div class="card-meta">
            <span class="card-badge-lyrics">✓ Synced Lyrics Ready</span>
          </div>
        </div>
        <button class="card-sing-btn">Sing 🎤</button>
      `;

      card.addEventListener('click', () => {
        this.loadTrack(item);
      });

      this.dom.libraryList.appendChild(card);
    });
  }

  async searchYouTube(query) {
    if (!query) return;
    const lyricsOnly = this.dom.lyricsOnlyFilter.checked;
    this.showProcessing(true, 'Searching YouTube...', `Finding best matches for "${query}"`);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&lyricsOnly=${lyricsOnly}`);
      const data = await res.json();
      this.renderSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed: ' + err.message);
    } finally {
      this.showProcessing(false);
    }
  }

  renderSearchResults(results) {
    if (!results || results.length === 0) {
      this.dom.searchResults.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No results found. Try another artist or song title.</p>
        </div>
      `;
      return;
    }

    this.dom.searchResults.innerHTML = '';
    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <div class="card-thumb-wrap">
          <img src="${item.thumbnail}" class="card-thumb" alt="${item.title}" />
        </div>
        <div class="card-info">
          <div class="card-title">${item.title}</div>
          <div class="card-channel">${item.channel} &bull; ${item.durationString}</div>
          <div class="card-meta">
            <span class="card-badge-lyrics">✓ Synced Lyrics</span>
          </div>
        </div>
        <button class="card-sing-btn">Sing 🎤</button>
      `;

      card.addEventListener('click', () => {
        this.processTrack(item.url, item.title);
      });

      this.dom.searchResults.appendChild(card);
    });
  }

  showProcessing(show, title = '', detail = '') {
    if (show) {
      this.dom.processingTitle.textContent = title;
      this.dom.processingDetail.textContent = detail;
      this.dom.processingCard.classList.remove('hidden');
    } else {
      this.dom.processingCard.classList.add('hidden');
    }
  }

  // 11. Event Listeners
  initEventListeners() {
    // Theme Select
    this.dom.themeSelect.addEventListener('change', (e) => {
      document.body.dataset.theme = e.target.value;
    });

    // Stage Mode Switcher (Equalizer vs Vinyl Disc)
    this.dom.stageModeBtn.addEventListener('click', () => {
      if (this.stageMode === 'equalizer') {
        this.stageMode = 'vinyl';
        this.dom.stageModeText.textContent = 'Mode: Vinyl Disc 💿';
        this.dom.vinylDisc.style.display = 'block';
        if (this.isPlaying) this.dom.vinylDisc.classList.add('spinning');
      } else {
        this.stageMode = 'equalizer';
        this.dom.stageModeText.textContent = 'Mode: Equalizer ✨';
        this.dom.vinylDisc.style.display = 'none';
      }
    });

    // Navigation tabs
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.tabBtns.forEach(b => b.classList.remove('active'));
        this.dom.tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // Genre filter chips in Catalog
    this.dom.genreChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.genreChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentGenre = chip.dataset.genre;
        this.renderCatalog(this.catalogData);
      });
    });

    // Search form
    this.dom.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = this.dom.searchInput.value.trim();
      this.searchYouTube(query);
    });

    // Quick chips
    this.dom.quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.searchInput.value = chip.dataset.query;
        this.searchYouTube(chip.dataset.query);
      });
    });

    // URL paste
    this.dom.urlSubmitBtn.addEventListener('click', () => {
      const url = this.dom.urlInput.value.trim();
      if (url) this.processTrack(url);
    });

    this.dom.refreshLibraryBtn.addEventListener('click', () => this.loadLibrary());

    // Transport controls
    this.dom.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.dom.skipBackBtn.addEventListener('click', () => {
      this.seek((this.dom.karaokeAudio.currentTime || 0) - 10);
    });
    this.dom.skipForwardBtn.addEventListener('click', () => {
      this.seek((this.dom.karaokeAudio.currentTime || 0) + 10);
    });
    this.dom.restartBtn.addEventListener('click', () => {
      this.seek(0);
    });

    // Scrubber click & smooth drag
    let isDraggingScrubber = false;
    const handleScrub = (e) => {
      const rect = this.dom.scrubberWrap.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pct * (this.dom.karaokeAudio.duration || 0);
      this.seek(targetTime);
    };

    this.dom.scrubberWrap.addEventListener('mousedown', (e) => {
      isDraggingScrubber = true;
      handleScrub(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingScrubber) handleScrub(e);
    });

    document.addEventListener('mouseup', () => {
      isDraggingScrubber = false;
    });

    // Master Music Volume Controls
    if (this.dom.masterVolumeSlider) {
      this.dom.masterVolumeSlider.addEventListener('input', (e) => {
        this.setMasterVolume(parseInt(e.target.value, 10));
      });
    }

    if (this.dom.masterMuteBtn) {
      this.dom.masterMuteBtn.addEventListener('click', () => {
        if (this.isMuted) {
          this.setMasterVolume(this.previousMasterVol || 90);
          this.isMuted = false;
        } else {
          this.previousMasterVol = parseInt(this.dom.masterVolumeSlider.value, 10) || 90;
          this.setMasterVolume(0);
          this.isMuted = true;
        }
      });
    }

    // Audio time update
    this.dom.karaokeAudio.addEventListener('timeupdate', () => {
      this.updateScrubber();
      this.updateLyrics(this.dom.karaokeAudio.currentTime);

      const diff = Math.abs(this.dom.originalAudio.currentTime - this.dom.karaokeAudio.currentTime);
      if (diff > 0.15) {
        this.dom.originalAudio.currentTime = this.dom.karaokeAudio.currentTime;
      }
    });

    this.dom.karaokeAudio.addEventListener('ended', () => {
      this.pause();
      this.seek(0);
    });

    // Vocal Slider
    this.dom.vocalSlider.addEventListener('input', (e) => {
      this.updateVocalMix(parseInt(e.target.value, 10));
    });

    this.dom.vocalPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.vocal, 10);
        this.dom.vocalSlider.value = val;
        this.updateVocalMix(val);
      });
    });

    // Microphone & Reverb
    this.dom.micToggleBtn.addEventListener('click', () => this.toggleMicrophone());
    this.dom.micVolumeSlider.addEventListener('input', () => this.updateMicVolume());
    this.dom.reverbSlider.addEventListener('input', () => this.updateReverbLevel());

    // Pitch & Speed
    let currentKey = 0;
    const updatePitch = () => {
      this.dom.keySemitones.textContent = (currentKey > 0 ? '+' : '') + currentKey;
      const rate = Math.pow(2, currentKey / 12);
      this.dom.karaokeAudio.playbackRate = rate * parseFloat(this.dom.playbackSpeedSelect.value);
      this.dom.originalAudio.playbackRate = this.dom.karaokeAudio.playbackRate;
    };

    this.dom.pitchDownBtn.addEventListener('click', () => {
      if (currentKey > -6) {
        currentKey--;
        updatePitch();
      }
    });

    this.dom.pitchUpBtn.addEventListener('click', () => {
      if (currentKey < 6) {
        currentKey++;
        updatePitch();
      }
    });

    this.dom.playbackSpeedSelect.addEventListener('change', () => updatePitch());

    // Lyrics Sync offset
    const setSyncOffset = (offset) => {
      this.syncOffset = Math.round(offset * 10) / 10;
      this.dom.syncDisplay.textContent = `${this.syncOffset > 0 ? '+' : ''}${this.syncOffset.toFixed(1)}s`;
      this.updateLyrics(this.dom.karaokeAudio.currentTime);
    };

    this.dom.syncMinusHalf.addEventListener('click', () => setSyncOffset(this.syncOffset - 0.5));
    this.dom.syncMinusTenth.addEventListener('click', () => setSyncOffset(this.syncOffset - 0.1));
    this.dom.syncPlusTenth.addEventListener('click', () => setSyncOffset(this.syncOffset + 0.1));
    this.dom.syncPlusHalf.addEventListener('click', () => setSyncOffset(this.syncOffset + 0.5));
    this.dom.syncReset.addEventListener('click', () => setSyncOffset(0));

    // Custom Lyrics Editor
    this.dom.manualLyricsBtn.addEventListener('click', () => {
      if (this.lyrics && this.lyrics.length > 0) {
        const formatted = this.lyrics.map(l => {
          const m = Math.floor(l.time / 60);
          const s = Math.floor(l.time % 60);
          const ms = Math.floor((l.time % 1) * 100);
          return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}] ${l.text}`;
        }).join('\n');
        this.dom.customLyricsInput.value = formatted;
      }
      this.dom.lyricsEditModal.classList.remove('hidden');
    });

    this.dom.closeLyricsModalBtn.addEventListener('click', () => {
      this.dom.lyricsEditModal.classList.add('hidden');
    });
    this.dom.cancelCustomLyricsBtn.addEventListener('click', () => {
      this.dom.lyricsEditModal.classList.add('hidden');
    });

    this.dom.saveCustomLyricsBtn.addEventListener('click', () => {
      const text = this.dom.customLyricsInput.value;
      const parsed = this.parseLRC(text);
      if (parsed.length > 0) {
        this.lyrics = parsed;
        this.renderLyrics();
        this.dom.lyricsEditModal.classList.add('hidden');
      } else {
        alert('Could not parse timestamps. Please format as [00:12.34] lyric line');
      }
    });

    // Recording Modal
    this.dom.recordToggleBtn.addEventListener('click', () => this.toggleRecording());
    this.dom.closeModalBtn.addEventListener('click', () => {
      this.dom.recordingModal.classList.add('hidden');
      this.dom.recordedAudioPlayer.pause();
    });
    this.dom.dismissModalBtn.addEventListener('click', () => {
      this.dom.recordingModal.classList.add('hidden');
      this.dom.recordedAudioPlayer.pause();
    });

    // Fullscreen Stage Mode
    this.dom.fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen blocked:', err);
        });
      } else {
        document.exitFullscreen();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        this.seek(this.dom.karaokeAudio.currentTime - 5);
      } else if (e.code === 'ArrowRight') {
        this.seek(this.dom.karaokeAudio.currentTime + 5);
      }
    });
  }

  parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length > 0) {
        const text = line.replace(timeRegex, '').trim();
        for (const match of matches) {
          const mins = parseInt(match[1], 10);
          const secs = parseInt(match[2], 10);
          const msStr = (match[3] || '0').padEnd(3, '0').slice(0, 3);
          const ms = parseInt(msStr, 10);
          const time = mins * 60 + secs + ms / 1000;
          result.push({ time, text });
        }
      }
    }

    result.sort((a, b) => a.time - b.time);
    return result;
  }
}

// Start Engine on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.karaokeApp = new KaraokeEngine();
});
