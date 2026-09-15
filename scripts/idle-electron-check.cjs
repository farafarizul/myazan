'use strict';
// Integration check: actual Electron UI/preloads/audio and a new disposable SQLite database.
const { app, BrowserWindow, powerMonitor } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase, runMigrations, closeDatabase, getDatabase, saveAudioSettings, setSetting } = require('../src/main/database');
const { registerIpcHandlers } = require('../src/main/ipc');
const { startAudioEngine, stopAudioEngine, getPlaybackStatus } = require('../src/main/services/audio');
const { getAudioWebContents } = require('../src/main/services/audio/audio-window');

const root = path.resolve(__dirname, '../..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myazan-electron-check-'));
app.setPath('userData', dataDir);
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // Keep the check alive while testing engine restart.
const RealDate = Date;
let fakeNow = new RealDate(2026, 8, 15, 12, 0, 0);
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [fakeNow.getTime()])); }
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let mainWindow;
const errors = [];
const checks = [];
async function waitFor(check, label) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
const ui = code => mainWindow.webContents.executeJavaScript(code);
const audio = () => getAudioWebContents().executeJavaScript(`(() => {
  const el = document.getElementById('idle-player');
  return { paused: el.paused, time: el.currentTime, src: el.src, volume: el.volume, error: el.error?.message };
})()`);
async function click(id) {
  await waitFor(() => ui(`!document.getElementById('${id}').disabled`), `${id} enabled`);
  await ui(`document.getElementById('${id}').click()`);
}
async function run() {
  await app.whenReady();
  openDatabase();
  runMigrations();
  runMigrations(); // Existing installs must not reapply the ALTER TABLE.
  setSetting('active_zone_code', null, 'string');
  const playlist = path.join(dataDir, 'playlist');
  fs.mkdirSync(playlist);
  const sample = fs.readdirSync(path.join(root, 'src/assets/zikir_default')).find(name => name.endsWith('.mp3'));
  for (const name of ['01 Audio & Zikir.mp3', '02 Lagu Pilihan.mp3']) {
    fs.copyFileSync(path.join(root, 'src/assets/zikir_default', sample), path.join(playlist, name));
  }
  saveAudioSettings({ idle_folder_path: playlist, idle_enabled: 0, idle_volume: 25 });
  registerIpcHandlers(() => mainWindow, () => {}, () => {});
  startAudioEngine();
  await waitFor(() => getAudioWebContents() && !getAudioWebContents().isLoading(), 'audio window');
  getAudioWebContents().setAudioMuted(true);
  mainWindow = new BrowserWindow({ width: 900, height: 850, show: false, webPreferences: {
    preload: path.join(root, 'dist/preload/index.js'), contextIsolation: true, nodeIntegration: false,
    sandbox: false, backgroundThrottling: false, offscreen: true,
  } });
  mainWindow.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') errors.push(details.message);
  });
  await mainWindow.loadFile(path.join(root, 'dist/renderer/index.html'));
  await waitFor(() => ui(`document.getElementById('zikir-folder-nama').textContent === 'playlist'`), 'settings loaded');
  await ui(`document.querySelector('[data-page="zikir"]').click()`);
  await ui(`document.getElementById('zikir-idle-aktif').click()`);
  await click('zikir-btn-simpan');
  await waitFor(() => getPlaybackStatus().idleState === 'playing', 'enabled and saved from Zikir');
  await waitFor(async () => (await audio()).time > 1, 'actual MP3 playing');
  assert.equal(getDatabase().prepare('SELECT idle_enabled FROM audio_settings').get().idle_enabled, 1);
  checks.push('Zikir activation saves via real IPC and SQLite; MP3 plays');

  await click('zikir-btn-pause');
  await waitFor(async () => (await audio()).paused, 'pause');
  const pausedTime = (await audio()).time;
  await delay(250);
  assert.ok(Math.abs((await audio()).time - pausedTime) < 0.05);
  await click('zikir-btn-play');
  await waitFor(async () => !(await audio()).paused && (await audio()).time > pausedTime + 0.1, 'resume position');
  checks.push('Pause holds currentTime; Play resumes the same position');

  await click('zikir-btn-next');
  await waitFor(() => getPlaybackStatus().idleTrack === '02 Lagu Pilihan.mp3', 'next');
  await click('zikir-btn-previous');
  await waitFor(() => getPlaybackStatus().idleTrack === '01 Audio & Zikir.mp3', 'previous');
  await click('zikir-btn-previous');
  await waitFor(() => getPlaybackStatus().idleTrack === '02 Lagu Pilihan.mp3', 'wrap previous');
  await waitFor(async () => (await audio()).time > 0.5, 'selected MP3 playing');
  checks.push('Next / Previous change real audio source and wrap');

  await ui(`document.getElementById('zikir-jadual-aktif').click();
    document.getElementById('zikir-waktu-senyap').value = '10:00';
    document.getElementById('zikir-waktu-mula').value = '10:00';`);
  await click('zikir-btn-simpan');
  await waitFor(() => ui(`document.getElementById('zikir-status').textContent.includes('berbeza')`), 'equal times rejected');
  assert.equal(getDatabase().prepare('SELECT idle_schedule_enabled FROM audio_settings').get().idle_schedule_enabled, 0);
  checks.push('Equal schedule times rejected without database writes');

  await ui(`document.getElementById('zikir-waktu-mula').value = '13:00'`);
  await click('zikir-btn-simpan');
  await waitFor(() => getPlaybackStatus().idleState === 'scheduled', 'quiet schedule takes effect');
  await waitFor(async () => (await audio()).paused, 'quiet audio paused');
  await waitFor(() => ui(`document.getElementById('zikir-player-status').textContent === 'Waktu Senyap'`), 'quiet label');
  assert.equal(await ui(`document.getElementById('zikir-btn-play').disabled`), true);
  const quietTime = (await audio()).time;
  fakeNow = new RealDate(2026, 8, 15, 13, 0, 0);
  powerMonitor.emit('resume');
  await waitFor(async () => !(await audio()).paused && (await audio()).time > quietTime, 'scheduled resume');
  assert.equal(getPlaybackStatus().idleTrack, '02 Lagu Pilihan.mp3');
  checks.push('Scheduled silence pauses actual audio; PC resume/wake restores the same track position');

  // A settings save must retain both playback position and unrelated preferences.
  await click('zikir-btn-pause');
  await waitFor(async () => (await audio()).paused, 'pause before settings');
  const beforeSave = (await audio()).time;
  const saveResult = await ui(`window.myAzan.saveSettings({ tvMosqueName: 'QA Mosque', idleVolume: 40 })`);
  assert.equal(saveResult.ok, true);
  await delay(200);
  assert.equal((await audio()).paused, true);
  assert.ok(Math.abs((await audio()).time - beforeSave) < 0.05);
  assert.equal((await audio()).volume, 0.4);
  checks.push('Unrelated settings and volume save preserve Pause and currentTime');

  // Screenshot normal and minimum supported desktop sizes.
  const screenshots = path.join(root, 'dist-build/qa');
  fs.mkdirSync(screenshots, { recursive: true });
  await ui(`document.getElementById('zikir-waktu-senyap').value = '22:00';
    document.getElementById('zikir-waktu-mula').value = '05:30';
    document.getElementById('zikir-waktu-mula').dispatchEvent(new Event('change'));`);
  await click('zikir-btn-simpan');
  await waitFor(() => ui(`document.getElementById('zikir-status').textContent.includes('berjaya')`), 'save success');
  assert.equal(getPlaybackStatus().idleState, 'paused');
  await waitFor(() => ui(`document.getElementById('zikir-player-status').textContent === 'Dijeda'`), 'paused label');
  await mainWindow.webContents.setZoomFactor(0.85);
  await ui(`document.querySelector('.idle-now-playing').parentElement.scrollIntoView({ block: 'start' })`);
  mainWindow.webContents.invalidate();
  await delay(250);
  fs.writeFileSync(path.join(screenshots, 'idle-player-desktop.png'), (await mainWindow.webContents.capturePage()).toPNG());
  mainWindow.setSize(720, 700);
  mainWindow.webContents.setZoomFactor(1);
  await delay(250);
  await ui(`document.querySelector('.idle-now-playing').parentElement.scrollIntoView({ block: 'start' })`);
  mainWindow.webContents.invalidate();
  await delay(250);
  assert.equal(await ui(`document.querySelector('#page-zikir .page-content').scrollWidth <= document.querySelector('#page-zikir .page-content').clientWidth`), true);
  fs.writeFileSync(path.join(screenshots, 'idle-player-720.png'), (await mainWindow.webContents.capturePage()).toPNG());
  checks.push('UI has no horizontal overflow at the supported 720px window width');

  mainWindow.destroy();
  mainWindow = null;
  stopAudioEngine();
  closeDatabase();
  fakeNow = new RealDate(2026, 8, 15, 23, 0, 0);
  openDatabase();
  runMigrations();
  const persisted = getDatabase().prepare('SELECT * FROM audio_settings').get();
  assert.equal(persisted.idle_schedule_enabled, 1);
  assert.equal(persisted.idle_sleep_time, '22:00');
  assert.equal(persisted.idle_wake_time, '05:30');
  startAudioEngine();
  await waitFor(() => getAudioWebContents() && !getAudioWebContents().isLoading(), 'restarted audio');
  getAudioWebContents().setAudioMuted(true);
  assert.equal(getPlaybackStatus().idleState, 'scheduled');
  assert.equal((await audio()).paused, true);
  checks.push('Saved schedule persists after database reopen; startup during quiet hours is silent');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks, screenshots }, null, 2));
  console.log('IDLE_ELECTRON_CHECK_PASSED');
}
run().then(() => cleanup(0)).catch(error => { console.error(error); cleanup(1); });
function cleanup(code) {
  stopAudioEngine();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  closeDatabase();
  global.Date = RealDate;
  // Delete only the exact isolated test directory created above; never user data.
  try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 }); } catch { /* Electron may still hold cache files until exit. */ }
  app.exit(code);
}
