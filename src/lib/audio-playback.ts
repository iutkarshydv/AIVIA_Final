/**
 * Audio Playback Queue Manager
 * Handles TTS audio playback with interruption support
 */

export type PlaybackState = 'idle' | 'playing' | 'paused';

export class AudioPlaybackQueue {
  private audioContext: AudioContext;
  private audioQueue: AudioBuffer[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private state: PlaybackState = 'idle';
  private onStateChange?: (state: PlaybackState) => void;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Add audio chunk to playback queue
   */
  async addChunk(audioData: ArrayBuffer): Promise<void> {
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (this.state === 'idle') {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to decode audio chunk:', error);
    }
  }

  /**
   * Play next audio chunk in queue
   */
  private playNext(): void {
    if (this.audioQueue.length === 0) {
      this.setState('idle');
      return;
    }

    const audioBuffer = this.audioQueue.shift()!;
    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext.destination);

    // Play next chunk when current finishes
    this.currentSource.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    this.currentSource.start(0);
    this.setState('playing');
  }

  /**
   * Stop playback immediately (for barge-in)
   */
  stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (error) {
        // Already stopped
      }
      this.currentSource = null;
    }

    // Clear queue
    this.audioQueue = [];
    this.setState('idle');
  }

  /**
   * Pause playback (not fully implemented in Web Audio API)
   */
  pausePlayback(): void {
    this.stopPlayback(); // For now, treat pause as stop
    this.setState('paused');
  }

  /**
   * Resume playback
   */
  resumePlayback(): void {
    if (this.state === 'paused' && this.audioQueue.length > 0) {
      this.playNext();
    }
  }

  /**
   * Get current playback state
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Register state change callback
   */
  onStateChanged(callback: (state: PlaybackState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: PlaybackState): void {
    this.state = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopPlayback();
    this.onStateChange = undefined;
  }
}
