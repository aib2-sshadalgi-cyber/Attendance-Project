const DESCRIPTOR_DIM = 128;

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function isValidDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === DESCRIPTOR_DIM &&
    descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/**
 * Returns true if probe matches reference within threshold (face-api typical ~0.6).
 */
function faceMatch(probe, reference, threshold) {
  const t = typeof threshold === 'number' ? threshold : Number(process.env.FACE_MATCH_THRESHOLD || 0.55);
  if (!isValidDescriptor(probe) || !isValidDescriptor(reference)) {
    return false;
  }
  return euclideanDistance(probe, reference) <= t;
}

module.exports = {
  DESCRIPTOR_DIM,
  euclideanDistance,
  isValidDescriptor,
  faceMatch,
};
