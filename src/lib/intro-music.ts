export type IntroMusicPlayer = {
  context: AudioContext;
  stop: () => void;
};

export function createIntroMusicPlayer(): IntroMusicPlayer {
  const context = new window.AudioContext();
  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);

  const pads = [130.81, 164.81, 196, 261.63].map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.12 : 0.045;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    return oscillator;
  });

  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392];
  let noteIndex = 0;
  const melodyTimer = window.setInterval(() => {
    const now = context.currentTime;
    const note = context.createOscillator();
    const envelope = context.createGain();
    note.type = "sine";
    note.frequency.value = melody[noteIndex % melody.length];
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    note.connect(envelope);
    envelope.connect(master);
    note.start(now);
    note.stop(now + 0.45);
    noteIndex += 1;
  }, 520);

  return {
    context,
    stop: () => {
      window.clearInterval(melodyTimer);
      master.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
      window.setTimeout(() => void context.close(), 350);
      pads.forEach((pad) => pad.stop(context.currentTime + 0.25));
    },
  };
}
