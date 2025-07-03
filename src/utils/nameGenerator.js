/**
 * Generates a unique, creative name for a new project.
 */
const adjectives = [
  'Radiant', 'Cosmic', 'Quantum', 'Nebula', 'Ethereal', 'Lunar', 'Solar', 
  'Astral', 'Chromatic', 'Polygonal', 'Vector', 'Glimmering', 'Pulsing'
];

const nouns = [
  'Orb', 'Flow', 'Canvas', 'Beam', 'Vector', 'Tapestry', 'Dream', 
  'Echo', 'Prism', 'Matrix', 'Weaver', 'Rift', 'Signal'
];

export function generateProjectName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999
  
  return `${adj} ${noun} ${number}`;
} 