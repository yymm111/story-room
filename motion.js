// Shared timing for spatial transitions. DOM equivalents live in motion.css.
export const motionSeconds = Object.freeze({
  fold: .55, page: 1.30, pop: 1.45, open: 2.10, close: 1.60, lift: .85
});

export const feedbackMotion = Object.freeze({duration: 180, easing: 'cubic-bezier(.2,.7,.25,1)'});

export function easeInOut(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

export function approach(speed, seconds) {
  return 1 - Math.exp(-speed * seconds);
}
