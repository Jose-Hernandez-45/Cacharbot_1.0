import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    } else {
      console.warn("La síntesis de voz no está soportada en este navegador.");
    }
  }

  // Método para hablar una instrucción
  speak(instruction: string) {
    if (this.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.lang = 'es-ES';  // Aseguramos que la voz sea en español
  
      // Ajustar velocidad y tono para que suene más natural
      utterance.rate = 1;  // Velocidad de la voz (1 es velocidad normal)
      utterance.pitch = 1;  // Tono de la voz (1 es tono normal)
  
      // Hablar la instrucción
      this.speechSynthesis.speak(utterance);
    }
  }
  

  // Método para detener cualquier voz que esté sonando
  stop() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();  // Detiene cualquier síntesis en curso
    }
  }

  // Método para pausar la voz
  pause() {
    if (this.speechSynthesis) {
      this.speechSynthesis.pause();  // Pausa la síntesis
    }
  }

  // Método para reanudar la voz
  resume() {
    if (this.speechSynthesis) {
      this.speechSynthesis.resume();  // Reanuda la síntesis
    }
  }
}
