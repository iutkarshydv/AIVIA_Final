/**
 * ElevenLabs Realtime WebSocket Client
 * Manages connection and event handling for realtime voice interview
 */

import { ElevenLabsWebSocketMessage } from '@/types';
import { AudioPlaybackQueue } from './audio-playback';
import { AudioStreamManager, floatTo16BitPCM, encodePCMToBase64 } from './audio-stream';
import { VoiceActivityDetector } from './vad';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TranscriptEvent {
  type: 'partial' | 'final';
  speaker: 'candidate' | 'agent';
  text: string;
  timestamp: number;
}

export interface EvaluationEvent {
  questionId: string;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    examples: number;
    cultureFit: number;
    overall: number;
  };
  rationale: string;
}

export class ElevenLabsRealtimeClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private audioStreamManager: AudioStreamManager;
  private audioPlaybackQueue: AudioPlaybackQueue;
  private vad: VoiceActivityDetector | null = null;
  private hasLoggedFirstChunk = false;

  // Event handlers
  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onTranscript?: (event: TranscriptEvent) => void;
  private onEvaluation?: (event: EvaluationEvent) => void;
  private onError?: (error: Error) => void;

  constructor(audioContext: AudioContext) {
    console.log('🎵 ElevenLabsRealtimeClient constructor called');
    this.audioStreamManager = new AudioStreamManager();
    this.audioPlaybackQueue = new AudioPlaybackQueue(audioContext);
  }

  /**
   * Connect to ElevenLabs WebSocket
   */
  async connect(wsUrl: string): Promise<void> {
    console.log('🚀 connect() called with URL:', wsUrl);
    this.setState('connecting');

    try {
      // Initialize audio stream
      console.log('🎙️ Initializing audio stream...');
      await this.audioStreamManager.initialize();
      console.log('✅ Audio stream initialized');

      // Create WebSocket connection
      console.log('🔌 Creating WebSocket connection...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket OPEN event fired');
        this.handleOpen();
      };
      
      this.ws.onmessage = (event) => {
        console.log('📨 WebSocket MESSAGE received:', event.data.substring(0, 100));
        this.handleMessage(event);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket ERROR event:', error);
        this.handleError(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket CLOSE event:', event.code, event.reason);
        this.handleClose();
      };

      // Setup audio streaming
      console.log('🎵 Setting up audio streaming callback...');
      this.audioStreamManager.onAudioData((audioData) => {
        // Log first audio chunk only
        if (!this.hasLoggedFirstChunk) {
          console.log('🎙️ First audio chunk received, length:', audioData.length);
          this.hasLoggedFirstChunk = true;
        }
        this.sendAudioChunk(audioData);
      });

      // Setup VAD for barge-in detection
      const audioContext = this.audioStreamManager.getAudioContext();
      if (audioContext) {
        console.log('🎵 Setting up Voice Activity Detection...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.vad = new VoiceActivityDetector(audioContext, mediaStream);
        
        this.vad.onVoiceStarted(() => {
          console.log('🗣️ Voice activity detected');
          if (this.audioPlaybackQueue.getState() === 'playing') {
            this.handleBargeIn();
          }
        });
        
        this.vad.start();
        console.log('✅ VAD started');
      }

      // Setup playback state monitoring
      this.audioPlaybackQueue.onStateChanged((state) => {
        console.log('🔊 Playback state changed:', state);
      });

      console.log('✅ Client setup complete, waiting for WebSocket connection...');

    } catch (error) {
      console.error('❌ Error during connect:', error);
      this.setState('error');
      if (this.onError) {
        this.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Start streaming audio
   */
  startStreaming(): void {
    console.log('🎙️ startStreaming() called');
    this.audioStreamManager.startStreaming();
  }

  /**
   * Stop streaming audio
   */
  stopStreaming(): void {
    console.log('🛑 stopStreaming() called');
    this.audioStreamManager.stopStreaming();
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    console.log('🔌 disconnect() called');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.audioStreamManager.stop();
    this.audioPlaybackQueue.dispose();
    
    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }

    this.setState('disconnected');
  }

  /**
   * Handle WebSocket open - Send initialization
   */
  private handleOpen(): void {
    console.log('🎉 WebSocket connection established');
    this.setState('connected');
    
    // Send initial configuration to ElevenLabs
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending conversation_initiation_client_data...');
      const initMessage = {
        type: 'conversation_initiation_client_data',
        conversation_config_override: {}
      };
      
      this.ws.send(JSON.stringify(initMessage));
      console.log('✅ Initialization message sent');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      console.log('📨 Message type:', message.type || Object.keys(message)[0], message);

      // Handle ElevenLabs Conversational AI message types with _event suffix
      if (message.type === 'conversation_initiation_metadata' || message.conversation_initiation_metadata_event) {
        console.log('✅ Conversation initialized:', message.conversation_initiation_metadata_event);
      } else if (message.type === 'audio' || message.audio_event) {
        console.log('🔊 Received agent audio chunk');
        const audioData = message.audio_event?.audio_base_64 || message.audio;
        if (audioData) {
          this.handleAudioChunk({ audio: audioData });
        }
      } else if (message.type === 'user_transcription' || message.user_transcription_event) {
        const text = message.user_transcription_event?.user_transcription || message.user_transcription;
        console.log('📝 User transcription:', text);
        this.handleTranscriptFinal({
          speaker: 'candidate',
          text: text,
          timestamp: Date.now()
        });
      } else if (message.type === 'agent_response' || message.agent_response_event) {
        const text = message.agent_response_event?.agent_response || message.agent_response;
        console.log('💬 Agent response:', text);
        this.handleTranscriptFinal({
          speaker: 'agent',
          text: text,
          timestamp: Date.now()
        });
      } else if (message.agent_response_correction) {
        console.log('✏️ Agent correction:', message.agent_response_correction);
      } else if (message.interruption) {
        console.log('🛑 Interruption detected');
      } else if (message.ping || message.ping_event) {
        const pingValue = message.ping_event?.ping_ms || message.ping;
        console.log('🏓 Ping received, sending pong');
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ pong: pingValue }));
        }
      } else {
        console.log('❓ Unhandled message type:', message);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    console.error('❌ WebSocket error event:', error);
    this.setState('error');
    
    if (this.onError) {
      this.onError(new Error('WebSocket connection error'));
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    console.log('🔌 WebSocket connection closed');
    this.setState('disconnected');
  }

  /**
   * Send audio chunk through WebSocket
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Convert to 16-bit PCM
      const pcm = floatTo16BitPCM(audioData);
      const base64Audio = encodePCMToBase64(pcm);

      // ElevenLabs expects this format
      const message = {
        user_audio_chunk: base64Audio
      };

      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Failed to send audio chunk:', error);
    }
  }

  /**
   * Handle barge-in (user interrupts agent)
   */
  private handleBargeIn(): void {
    console.log('🛑 Barge-in detected - stopping agent playback');
    
    this.audioPlaybackQueue.stopPlayback();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'client.interruption',
        data: {
          reason: 'user_barge_in',
          timestamp: Date.now(),
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle partial transcript
   */
  private handleTranscriptPartial(data: any): void {
    if (this.onTranscript) {
      this.onTranscript({
        type: 'partial',
        speaker: data.speaker || 'candidate',
        text: data.text,
        timestamp: data.timestamp || Date.now(),
      });
    }
  }

  /**
   * Handle final transcript
   */
  private handleTranscriptFinal(data: any): void {
    console.log('📝 Final transcript:', data);
    if (this.onTranscript) {
      this.onTranscript({
        type: 'final',
        speaker: data.speaker || 'candidate',
        text: data.text,
        timestamp: data.timestamp || Date.now(),
      });
    }
  }

  /**
   * Handle audio chunk from agent
   */
  private async handleAudioChunk(data: { audio: string }): Promise<void> {
    try {
      // Decode base64 audio
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Queue for playback - addChunk expects ArrayBuffer
      console.log('🔊 Queueing audio for playback, bytes:', bytes.length);
      await this.audioPlaybackQueue.addChunk(bytes.buffer);
    } catch (error) {
      console.error('❌ Failed to process audio chunk:', error);
    }
  }

  /**
   * Handle evaluation from agent
   */
  private handleEvaluation(data: any): void {
    console.log('📊 Evaluation received:', data);
    if (this.onEvaluation) {
      this.onEvaluation(data);
    }
  }

  /**
   * Handle server error
   */
  private handleServerError(data: any): void {
    console.error('❌ Server error:', data);
    if (this.onError) {
      this.onError(new Error(data.message || 'Server error'));
    }
  }

  /**
   * Event handler registration
   */
  onConnectionStateChanged(handler: (state: ConnectionState) => void): void {
    console.log('📌 Registered connection state handler');
    this.onConnectionStateChange = handler;
  }

  onTranscriptReceived(handler: (event: TranscriptEvent) => void): void {
    console.log('📌 Registered transcript handler');
    this.onTranscript = handler;
  }

  onEvaluationReceived(handler: (event: EvaluationEvent) => void): void {
    console.log('📌 Registered evaluation handler');
    this.onEvaluation = handler;
  }

  onErrorOccurred(handler: (error: Error) => void): void {
    console.log('📌 Registered error handler');
    this.onError = handler;
  }

  private setState(state: ConnectionState): void {
    console.log('🔄 State changed:', this.state, '→', state);
    this.state = state;
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state);
    }
  }
}
