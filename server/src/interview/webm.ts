// Browsers' MediaRecorder writes WebM as a live stream: no Duration in its Info, so players show a
// growing guess for the length and can't seek. Recordings get the Duration (known from transcription)
// written in when they're played back. EBML layout: https://www.matroska.org/technical/elements.html

const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const CLUSTER = 0x1f43b675;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
const EBML_HEADER = 0x1a45dfa3;

type Vint = { value: number; length: number; unknown: boolean };

/** Reads an element ID (marker bits kept) at `offset`. */
function readId(buffer: Buffer, offset: number): { id: number; length: number } | null {
  const first = buffer[offset];
  if (first === undefined) return null;
  const length = first >= 0x80 ? 1 : first >= 0x40 ? 2 : first >= 0x20 ? 3 : first >= 0x10 ? 4 : 0;
  if (!length || offset + length > buffer.length) return null;
  return { id: buffer.readUIntBE(offset, length), length };
}

/** Reads an element size (marker bit removed) at `offset`. */
function readSize(buffer: Buffer, offset: number): Vint | null {
  const first = buffer[offset];
  if (first === undefined || first === 0) return null;
  const length = Math.clz32(first) - 23; // 1 for 0b1xxxxxxx ... 8 for 0b00000001
  if (offset + length > buffer.length) return null;
  let value = first & (0xff >> length);
  let allOnes = value === 0xff >> length;
  for (let index = 1; index < length; index++) {
    const byte = buffer[offset + index]!;
    value = value * 256 + byte;
    allOnes &&= byte === 0xff;
  }
  return { value, length, unknown: allOnes };
}

/** An element size in exactly `length` bytes, or null if it doesn't fit. */
function encodeSize(value: number, length: number): Buffer | null {
  if (value >= 2 ** (7 * length) - 1) return null;
  const bytes = Buffer.alloc(length);
  let rest = value;
  for (let index = length - 1; index >= 0; index--) {
    bytes[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  bytes[0]! |= 0x80 >> (length - 1);
  return bytes;
}

/** The recording with its Duration set, or unchanged if it isn't WebM, already has one, or can't be read. */
export function withWebmDuration(audio: Buffer, seconds: number): Buffer {
  if (!(seconds > 0) || readId(audio, 0)?.id !== EBML_HEADER) return audio;
  const headerSize = readSize(audio, 4);
  if (!headerSize) return audio;
  let offset = 4 + headerSize.length + headerSize.value;

  const segment = readId(audio, offset);
  if (segment?.id !== SEGMENT) return audio;
  const segmentSizeAt = offset + segment.length;
  const segmentSize = readSize(audio, segmentSizeAt);
  if (!segmentSize) return audio;
  offset = segmentSizeAt + segmentSize.length;

  // Info comes before the first Cluster.
  for (let guard = 0; guard < 32; guard++) {
    const element = readId(audio, offset);
    if (!element || element.id === CLUSTER) return audio;
    const size = readSize(audio, offset + element.length);
    if (!size || size.unknown) return audio;
    const contentStart = offset + element.length + size.length;
    const contentEnd = contentStart + size.value;
    if (contentEnd > audio.length) return audio;

    if (element.id === INFO) {
      let timecodeScale = 1_000_000;
      for (let child = contentStart; child < contentEnd; ) {
        const childId = readId(audio, child);
        const childSize = childId && readSize(audio, child + childId.length);
        if (!childId || !childSize) return audio;
        const valueAt = child + childId.length + childSize.length;
        if (childId.id === DURATION) return audio;
        if (childId.id === TIMECODE_SCALE && childSize.value >= 1 && childSize.value <= 6) {
          timecodeScale = audio.readUIntBE(valueAt, childSize.value);
        }
        child = valueAt + childSize.value;
      }

      const duration = Buffer.alloc(11);
      duration.writeUInt16BE(DURATION, 0);
      duration[2] = 0x88; // size: 8 bytes
      duration.writeDoubleBE((seconds * 1e9) / timecodeScale, 3);
      const newInfoSize = encodeSize(size.value + duration.length, 8)!;
      const grownBy = element.length + newInfoSize.length + size.value + duration.length - (contentEnd - offset);

      // A live recording's Segment has an unknown size, which stays as it is; a known one grows with Info.
      const segmentSizeBytes = segmentSize.unknown
        ? audio.subarray(segmentSizeAt, segmentSizeAt + segmentSize.length)
        : encodeSize(segmentSize.value + grownBy, segmentSize.length);
      if (!segmentSizeBytes) return audio;
      return Buffer.concat([
        audio.subarray(0, segmentSizeAt),
        segmentSizeBytes,
        audio.subarray(segmentSizeAt + segmentSize.length, offset),
        audio.subarray(offset, offset + element.length),
        newInfoSize,
        audio.subarray(contentStart, contentEnd),
        duration,
        audio.subarray(contentEnd),
      ]);
    }
    offset = contentEnd;
  }
  return audio;
}
