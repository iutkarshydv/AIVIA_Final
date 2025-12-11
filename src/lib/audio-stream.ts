/**
 * Audio Stream Manager
 * Handles microphone capture and audio streaming to WebSocket
 */

export class AudioStreamManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isStreaming = false;

  async initialize(): Promise<void> {
    // Request microphone permission
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create script processor for audio data
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    // Connect nodes
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  onAudioData(callback: (data: Float32Array) => void): void {
    if (!this.processor) {
      throw new Error('AudioStreamManager not initialized');
    }

    this.processor.onaudioprocess = (event) => {
      if (this.isStreaming) {
        const inputData = event.inputBuffer.getChannelData(0);
        callback(inputData);
      }
    };
  }

  startStreaming(): void {
    this.isStreaming = true;
  }

  stopStreaming(): void {
    this.isStreaming = false;
  }

  async stop(): Promise<void> {
    this.isStreaming = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

/**
 * Convert Float32Array PCM to Int16Array
 */
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Encode PCM to base64 for WebSocket transmission
 */
export function encodePCMToBase64(pcm: Int16Array): string {
  const buffer = new ArrayBuffer(pcm.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(i * 2, pcm[i], true); // little-endian
  }
  
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
