
export const playSuccessSound = () => {
  const context = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(587.33, context.currentTime); // D5
  oscillator.frequency.setValueAtTime(880, context.currentTime + 0.1); // A5
  gainNode.gain.setValueAtTime(0.1, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.5);
};

export const playErrorSound = () => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, context.currentTime);
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
};
