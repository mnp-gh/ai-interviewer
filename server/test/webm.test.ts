import { describe, expect, it } from "vitest";
import { withWebmDuration } from "../src/interview/webm";

// A WebM shaped like MediaRecorder's: an EBML header, then a Segment of unknown size whose Info
// has a TimecodeScale but no Duration, then a Cluster.
const bytes = (...values: number[]) => Buffer.from(values);
const ebmlHeader = bytes(0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x01);
const timecodeScale = bytes(0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40); // 1,000,000
const info = Buffer.concat([bytes(0x15, 0x49, 0xa9, 0x66, 0x80 | timecodeScale.length), timecodeScale]);
const cluster = bytes(0x1f, 0x43, 0xb6, 0x75, 0x82, 0xe7, 0x00);
const unknownSize = bytes(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
const recording = Buffer.concat([ebmlHeader, bytes(0x18, 0x53, 0x80, 0x67), unknownSize, info, cluster]);

/** The Duration in milliseconds, if the file has one. */
const durationOf = (audio: Buffer) => {
  const at = audio.indexOf(bytes(0x44, 0x89, 0x88));
  return at < 0 ? null : audio.readDoubleBE(at + 3);
};

describe("withWebmDuration", () => {
  it("writes the Duration into a live recording's Info, keeping everything after it", () => {
    const fixed = withWebmDuration(recording, 52.5);
    expect(durationOf(fixed)).toBe(52_500);
    expect(fixed.subarray(-cluster.length).equals(cluster)).toBe(true);
    expect(withWebmDuration(fixed, 10).equals(fixed)).toBe(true); // already has one
  });

  it("grows a known Segment size with the Info", () => {
    const body = Buffer.concat([info, cluster]);
    const known = Buffer.concat([ebmlHeader, bytes(0x18, 0x53, 0x80, 0x67, 0x40, body.length), body]);
    const fixed = withWebmDuration(known, 3);
    expect(durationOf(fixed)).toBe(3000);
    expect(fixed.length - (ebmlHeader.length + 6)).toBe(fixed.readUInt16BE(ebmlHeader.length + 4) & 0x3fff);
  });

  it("leaves anything that isn't WebM alone", () => {
    const mp4 = Buffer.from("....ftypM4A ");
    expect(withWebmDuration(mp4, 5)).toBe(mp4);
  });
});
