/**
 * Audio Engine — antara muka awam untuk menguruskan tiga player audio.
 *
 * Eksport:
 * - startAudioEngine()   — mulakan engine (tetingkap tersembunyi + coordinator)
 * - stopAudioEngine()    — hentikan engine dan bersihkan semua sumber
 * - getPlaybackStatus()  — dapatkan status playback semasa
 */
import { createAudioWindow, destroyAudioWindow } from './audio-window';
import { startCoordinator, stopCoordinator, getPlaybackStatus } from './coordinator';
import type { PlaybackStatus } from '../../../shared/types';

let engineStarted = false;

/**
 * Mulakan audio engine.
 * Cipta tetingkap audio tersembunyi dan mulakan AudioCoordinator.
 */
export function startAudioEngine(): void {
  if (engineStarted) {
    console.warn('[audio-engine] Engine sudah berjalan — panggilan diabaikan.');
    return;
  }
  engineStarted = true;
  createAudioWindow();
  startCoordinator();
  console.log('[audio-engine] Audio engine dimulakan.');
}

/**
 * Hentikan audio engine dan bebaskan semua sumber.
 */
export function stopAudioEngine(): void {
  if (!engineStarted) return;
  stopCoordinator();
  destroyAudioWindow();
  engineStarted = false;
  console.log('[audio-engine] Audio engine dihentikan.');
}

/**
 * Dapatkan status playback semasa untuk paparan UI.
 */
export { getPlaybackStatus };
export type { PlaybackStatus };

