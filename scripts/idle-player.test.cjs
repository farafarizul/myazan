'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createLoader, root } = require('./test-helpers.cjs');

const schedule = createLoader()('src/shared/idle-schedule.ts');
const at = (time, day = 15) => new Date(2026, 8, day, ...time.split(':').map(Number));

test('overnight schedule includes sleep boundary and excludes wake boundary', () => {
  for (const [time, expected] of [['21:59', false], ['22:00', true], ['23:59', true], ['00:00', true], ['05:29', true], ['05:30', false]]) {
    assert.equal(schedule.isIdleQuietTime(at(time), '22:00', '05:30'), expected, time);
  }
});
test('daytime and midnight schedules', () => {
  assert.equal(schedule.isIdleQuietTime(at('10:00'), '10:00', '17:00'), true);
  assert.equal(schedule.isIdleQuietTime(at('17:00'), '10:00', '17:00'), false);
  assert.equal(schedule.isIdleQuietTime(at('23:59'), '22:00', '00:00'), true);
  assert.equal(schedule.isIdleQuietTime(at('00:00'), '22:00', '00:00'), false);
});
test('wake crossing handles missed ticks, multiple days and backward clock changes', () => {
  assert.equal(schedule.crossedIdleWakeTime(at('05:29'), at('05:30'), '05:30'), true);
  assert.equal(schedule.crossedIdleWakeTime(at('05:30'), at('05:31'), '05:30'), false);
  assert.equal(schedule.crossedIdleWakeTime(at('12:00'), at('12:00', 18), '05:30'), true);
  assert.equal(schedule.crossedIdleWakeTime(at('12:00'), at('11:00'), '05:30'), false);
});
test('strict time validation', () => {
  for (const value of ['00:00', '23:59', '05:30']) assert.equal(schedule.isValidIdleTime(value), true);
  for (const value of ['', '5:30', '24:00', '12:60', '12:00:00', null, 530]) assert.equal(schedule.isValidIdleTime(value), false);
});

function fixture(t, overrides = {}, time = '12:00') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myazan-idle-test-'));
  for (const name of ['01.mp3', '02.mp3', '10.MP3']) fs.writeFileSync(path.join(dir, name), 'fixture');
  const settings = {
    idle_enabled: 1, idle_folder_path: dir, idle_volume: 50, idle_resume_mode: 'restart_playlist',
    idle_schedule_enabled: 0, idle_sleep_time: '22:00', idle_wake_time: '05:30',
    azan_subuh_file_path: path.join(dir, '01.mp3'), azan_other_file_path: path.join(dir, '01.mp3'),
    ...overrides,
  };
  let now = at(time);
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } }
  const ipc = new EventEmitter();
  const power = new EventEmitter();
  const commands = [];
  const callbacks = new Set();
  let trigger;
  const AUDIO_IPC = Object.fromEntries(['PLAY_IDLE', 'PAUSE_IDLE', 'RESUME_IDLE', 'STOP_IDLE', 'SET_IDLE_VOLUME',
    'PLAY_AZAN', 'STOP_AZAN', 'PLAY_NOTIFICATION', 'STOP_NOTIFICATION', 'AZAN_ENDED', 'AZAN_ERROR',
    'NOTIFICATION_ENDED', 'NOTIFICATION_ERROR', 'IDLE_ENDED', 'IDLE_ERROR'].map(key => [key, key]));
  const load = createLoader({
    electron: { ipcMain: ipc, powerMonitor: power },
    'src/main/database/index.ts': { getAudioSettings: () => ({ ...settings }), getAllNotificationSettings: () => [
      { event_name: 'fajr', enabled: 1, audio_file_path: path.join(dir, '01.mp3') },
    ] },
    'src/main/services/scheduler/index.ts': { onSchedulerTrigger: callback => { trigger = callback; return () => { trigger = null; }; } },
    'src/main/services/audio/audio-window.ts': { AUDIO_IPC, sendToAudioWindow: (...args) => commands.push(args) },
  }, { Date: Clock, setInterval: callback => { callbacks.add(callback); return callback; }, clearInterval: callback => callbacks.delete(callback) });
  const api = load('src/main/services/audio/coordinator.ts');
  api.startCoordinator();
  t.after(() => { api.stopCoordinator(); fs.rmSync(dir, { recursive: true, force: true }); });
  return {
    api, dir, settings, commands, ipc, power, callbacks, status: () => api.getPlaybackStatus(),
    count: channel => commands.filter(command => command[0] === channel).length,
    tick: (time, day = 15, resume = false) => { now = at(time, day); if (resume) power.emit('resume'); else callbacks.forEach(callback => callback()); },
    prayer: (type = 'azan') => trigger({ triggerType: type, eventName: 'fajr' }),
  };
}

test('Play/Pause resumes loaded track and Next/Previous wrap while playing', t => {
  const f = fixture(t);
  assert.equal(f.status().idleTrack, '01.mp3');
  f.api.controlIdle('pause');
  assert.equal(f.status().idleState, 'paused');
  f.api.controlIdle('play');
  assert.equal(f.count('RESUME_IDLE'), 1);
  assert.equal(f.count('PLAY_IDLE'), 1);
  f.api.controlIdle('previous');
  assert.equal(f.status().idleTrack, '10.MP3');
  f.api.controlIdle('next');
  assert.equal(f.status().idleTrack, '01.mp3');
  f.ipc.emit('IDLE_ENDED');
  assert.equal(f.status().idleTrack, '02.mp3');
});
test('Next while paused selects a track without playing until Play', t => {
  const f = fixture(t);
  f.api.controlIdle('pause');
  f.api.controlIdle('next');
  assert.equal(f.status().idleTrack, '02.mp3');
  assert.equal(f.status().idleState, 'paused');
  assert.equal(f.count('PLAY_IDLE'), 1);
  f.api.controlIdle('play');
  assert.equal(f.count('PLAY_IDLE'), 2);
});
test('sleep pauses current track, prevents manual playback and resumes at wake', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 }, '21:59');
  f.api.controlIdle('next');
  f.tick('22:00');
  assert.equal(f.status().idleState, 'scheduled');
  assert.equal(f.api.controlIdle('play').ok, false);
  f.tick('05:29', 16);
  assert.equal(f.status().activePriority, 'none');
  f.tick('05:30', 16);
  assert.equal(f.status().idleState, 'playing');
  assert.equal(f.status().idleTrack, '02.mp3');
  assert.equal(f.count('RESUME_IDLE'), 1);
  assert.equal(f.count('PLAY_IDLE'), 2);
});
test('startup in quiet period stays silent until wake', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 }, '01:00');
  assert.equal(f.count('PLAY_IDLE'), 0);
  assert.equal(f.status().idleState, 'scheduled');
  f.tick('05:30');
  assert.equal(f.count('PLAY_IDLE'), 1);
});
test('disabled idle stays off across scheduled wake', t => {
  const f = fixture(t, { idle_enabled: 0, idle_schedule_enabled: 1 }, '01:00');
  f.tick('05:30');
  assert.equal(f.status().idleState, 'disabled');
  assert.equal(f.count('PLAY_IDLE'), 0);
  assert.equal(f.api.controlIdle('play').ok, false);
});
test('manual pause survives prayer completion and unrelated settings saves', t => {
  const f = fixture(t);
  f.api.controlIdle('next');
  f.api.controlIdle('pause');
  f.prayer();
  assert.equal(f.status().activePriority, 'azan');
  f.settings.idle_volume = 20;
  f.api.applySettingsChange();
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.status().idleState, 'paused');
  assert.equal(f.count('RESUME_IDLE'), 0);
  f.api.controlIdle('play');
  assert.equal(f.count('RESUME_IDLE'), 1);
  assert.equal(f.status().idleTrack, '02.mp3');
});
test('volume saves preserve a playing track', t => {
  const f = fixture(t);
  f.settings.idle_volume = 70;
  f.api.applySettingsChange();
  assert.equal(f.count('PLAY_IDLE'), 1);
  assert.equal(f.commands.at(-1)[0], 'SET_IDLE_VOLUME');
});
test('saving after adding a song refreshes playlist while retaining the playing track', t => {
  const f = fixture(t);
  f.api.controlIdle('next');
  fs.writeFileSync(path.join(f.dir, '00-new.mp3'), 'fixture');
  f.api.applySettingsChange();
  assert.equal(f.status().idleTrackCount, 4);
  assert.equal(f.status().idleTrack, '02.mp3');
  assert.equal(f.count('PLAY_IDLE'), 2);
  f.api.controlIdle('previous');
  assert.equal(f.status().idleTrack, '01.mp3');
});
test('normal prayer interruption still respects the existing restart mode', t => {
  const f = fixture(t);
  f.api.controlIdle('next');
  f.prayer();
  assert.equal(f.api.controlIdle('next').ok, false);
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.status().idleTrack, '01.mp3');
  assert.equal(f.count('PLAY_IDLE'), 3);
});
test('quiet period preserves position despite a prayer and volume save', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 }, '21:59');
  f.tick('22:00');
  f.prayer();
  f.api.applySettingsChange();
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.status().idleState, 'scheduled');
  f.tick('05:30', 16);
  assert.equal(f.count('RESUME_IDLE'), 1);
  assert.equal(f.count('PLAY_IDLE'), 1);
});
test('sleep starts during prayer; wake waits for prayer completion and resumes position', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 }, '21:59');
  f.prayer();
  f.tick('22:00');
  f.tick('05:30', 16);
  assert.equal(f.status().activePriority, 'azan');
  assert.equal(f.count('RESUME_IDLE'), 0);
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.count('RESUME_IDLE'), 1);
});
test('manual pause expires at next wake after a multi-day PC suspend', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 });
  f.api.controlIdle('pause');
  f.tick('12:00', 18, true);
  assert.equal(f.status().idleState, 'playing');
  assert.equal(f.count('RESUME_IDLE'), 1);
});
test('PC resume into quiet hours pauses immediately', t => {
  const f = fixture(t, { idle_schedule_enabled: 1 });
  f.tick('23:00', 15, true);
  assert.equal(f.status().idleState, 'scheduled');
  assert.equal(f.count('PAUSE_IDLE'), 1);
});
test('notification completion cannot interrupt an azan which preempted it', t => {
  const f = fixture(t);
  f.prayer('notification');
  f.prayer('azan');
  f.ipc.emit('NOTIFICATION_ENDED');
  f.ipc.emit('NOTIFICATION_ERROR', {}, 'stale');
  assert.equal(f.status().activePriority, 'azan');
  assert.equal(f.count('RESUME_IDLE'), 0);
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.status().idleState, 'playing');
});
test('enabling quiet schedule applies immediately; disabling it resumes loaded track', t => {
  const f = fixture(t, {}, '23:00');
  f.settings.idle_schedule_enabled = 1;
  f.api.applySettingsChange();
  assert.equal(f.status().idleState, 'scheduled');
  f.settings.idle_schedule_enabled = 0;
  f.api.applySettingsChange();
  assert.equal(f.count('RESUME_IDLE'), 1);
});
test('removing folder during prayer cannot resume the old playlist', t => {
  const f = fixture(t);
  f.prayer();
  f.settings.idle_folder_path = null;
  f.api.applySettingsChange();
  f.ipc.emit('AZAN_ENDED');
  assert.equal(f.status().idleState, 'empty');
  assert.equal(f.status().idleTrack, null);
  assert.equal(f.count('PLAY_IDLE'), 1);
});
test('all missing files stop without recursion and Play retries after recovery', t => {
  const f = fixture(t);
  for (const name of fs.readdirSync(f.dir)) fs.unlinkSync(path.join(f.dir, name));
  f.api.controlIdle('next');
  assert.equal(f.status().idleState, 'error');
  fs.writeFileSync(path.join(f.dir, 'new.mp3'), 'fixture');
  assert.equal(f.api.controlIdle('play').ok, true);
  assert.equal(f.status().idleTrack, 'new.mp3');
});
test('all corrupt tracks stop after one pass', t => {
  const f = fixture(t);
  for (let i = 0; i < 3; i++) f.ipc.emit('IDLE_ERROR', {}, 'decode error');
  assert.equal(f.status().idleState, 'error');
  assert.equal(f.count('PLAY_IDLE'), 3);
});
test('playlist is MP3 only, excludes directories and uses numeric filename order', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.dir, 'directory.mp3'));
  fs.writeFileSync(path.join(f.dir, 'other.wav'), 'fixture');
  const { readIdlePlaylist } = createLoader()('src/main/services/audio/playlist.ts');
  assert.deepEqual(Array.from(readIdlePlaylist(f.dir), file => path.basename(file)), ['01.mp3', '02.mp3', '10.MP3']);
});
test('invalid commands do not change playback and shutdown removes timers/listeners', t => {
  const f = fixture(t);
  assert.equal(f.api.controlIdle('erase').ok, false);
  assert.equal(f.status().idleState, 'playing');
  f.api.stopCoordinator();
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.power.listenerCount('resume'), 0);
  assert.equal(f.ipc.eventNames().length, 0);
});

test('migration adds disabled defaults without changing existing audio preferences; repository roundtrip', () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  try {
    const migrations = path.join(root, 'src/main/database/migrations');
    for (const file of fs.readdirSync(migrations).sort().filter(file => file.endsWith('.sql') && !file.startsWith('007'))) {
      db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'));
    }
    db.exec("UPDATE audio_settings SET idle_enabled = 1, idle_volume = 37, idle_folder_path = 'kept-folder'");
    db.exec(fs.readFileSync(path.join(migrations, '007_add_idle_schedule.sql'), 'utf8'));
    const adapter = { prepare(sql) { const statement = db.prepare(sql); statement.setAllowUnknownNamedParameters(true); return statement; } };
    const repository = createLoader({ 'src/main/database/connection.ts': { getDatabase: () => adapter } })('src/main/database/repositories/audio-settings.repository.ts');
    const before = repository.getAudioSettings();
    assert.equal(before.idle_volume, 37);
    assert.equal(before.idle_folder_path, 'kept-folder');
    assert.equal(before.idle_schedule_enabled, 0);
    assert.equal(before.idle_sleep_time, '22:00');
    assert.equal(before.idle_wake_time, '05:30');
    repository.saveAudioSettings({ idle_schedule_enabled: 1, idle_sleep_time: '23:15', idle_wake_time: '06:00' });
    assert.equal(repository.getAudioSettings().idle_sleep_time, '23:15');
    assert.equal(repository.getAudioSettings().idle_volume, 37);
    db.exec('DELETE FROM audio_settings');
    repository.saveAudioSettings({ idle_schedule_enabled: 1 });
    assert.equal(repository.getAudioSettings().idle_wake_time, '05:30');
  } finally { db.close(); }
});

test('settings validate complete and partial schedules before writing', () => {
  const writes = [];
  const row = { idle_schedule_enabled: 1, idle_sleep_time: '22:00', idle_wake_time: '05:30' };
  const api = createLoader({
    electron: { app: {} },
    'src/main/database/index.ts': { getAudioSettings: () => row, saveAudioSettings: update => writes.push(update),
      getAllNotificationSettings: () => [], getSetting: () => null, getActiveZoneCode: () => null },
  })('src/main/services/settings/index.ts');
  for (const payload of [{ idleSleepTime: '05:30' }, { idleWakeTime: '22:00' }, { idleSleepTime: '24:00' },
    { idleWakeTime: null }, { idleScheduleEnabled: 'yes' }]) {
    assert.throws(() => api.saveSettings(payload), /waktu|jadual/i);
  }
  assert.equal(writes.length, 0);
  api.saveSettings({ idleSleepTime: '23:00', idleScheduleEnabled: false });
  assert.equal(writes[0].idle_sleep_time, '23:00');
  assert.equal(writes[0].idle_schedule_enabled, 0);
  assert.equal(api.getSettings().idleWakeTime, '05:30');
});
