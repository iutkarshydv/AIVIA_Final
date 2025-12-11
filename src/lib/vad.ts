/**
 * Simple Voice Activity Detection
 * Detects when user is speaking based on audio volume
 */

export class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private isActive = false;
  private checkInterval: number | null = null;
  private threshold = 30; // Volume threshold (0-255)
  private onVoiceStart?: () => void;
  private onVoiceEnd?: () => void;

  constructor(audioContext: AudioContext, mediaStream: MediaStream) {
    this.audioContext = audioContext;

    // Create analyser
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    // Connect media stream to analyser
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(this.analyser);
  }

  /**
   * Start monitoring for voice activity
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = window.setInterval(() => {
      this.checkVoiceActivity();
    }, 100); // Check every 100ms
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check current voice activity
   */
  private checkVoiceActivity(): void {
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = Math.abs(this.dataArray[i] - 128);
      sum += value;
    }
    const average = sum / this.dataArray.length;

    const isVoiceDetected = average > this.threshold;

    // Detect transitions
    if (isVoiceDetected && !this.isActive) {
      this.isActive = true;
      if (this.onVoiceStart) {
        this.onVoiceStart();
      }
    } else if (!isVoiceDetected && this.isActive) {
      this.isActive = false;
      if (this.onVoiceEnd) {
        this.onVoiceEnd();
      }
    }
  }

  /**
   * Register voice start callback
   */
  onVoiceStarted(callback: () => void): void {
    this.onVoiceStart = callback;
  }

  /**
   * Register voice end callback
   */
  onVoiceEnded(callback: () => void): void {
    this.onVoiceEnd = callback;
  }

  /**
   * Set detection threshold (0-255)
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(255, threshold));
  }

  /**
   * Check if voice is currently active
   */
  isVoiceActive(): boolean {
    return this.isActive;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.analyser.disconnect();
  }
}
