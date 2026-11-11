import mongoose, { Schema } from "mongoose";

// Recordings live apart from their interview (ADR 0011): a long interview with retries can hold more
// audio than one document's 16 MB. Access always goes through the interview, which has the owner.
const recordingSchema = new Schema(
  {
    interviewId: { type: Schema.Types.ObjectId, required: true, index: true },
    audio: { type: Buffer, required: true },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "recordings" }
);
recordingSchema.index({ createdAt: 1 });

export const RecordingModel = mongoose.model("Recording", recordingSchema);

export type RecordingDoc = {
  _id: mongoose.Types.ObjectId;
  interviewId: mongoose.Types.ObjectId;
  audio: Buffer;
  mimeType: string;
  bytes: number;
  durationSeconds: number;
  createdAt: Date;
};

export type RecordingStorage = { count: number; bytes: number; oldest: Date | null };

/** How much space all recordings take. */
export async function recordingStorage(): Promise<RecordingStorage> {
  const [totals] = await RecordingModel.aggregate<RecordingStorage>([
    { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: "$bytes" }, oldest: { $min: "$createdAt" } } },
    { $project: { _id: 0, count: 1, bytes: 1, oldest: 1 } },
  ]);
  return totals ?? { count: 0, bytes: 0, oldest: null };
}

/**
 * Keeps a recording if there's room under `limitBytes`, returning its id; returns null when storage
 * is full (the answer is still transcribed and judged, its audio just isn't kept).
 */
export async function storeRecording(
  interviewId: mongoose.Types.ObjectId,
  audio: Buffer,
  mimeType: string,
  durationSeconds: number,
  limitBytes: number
): Promise<mongoose.Types.ObjectId | null> {
  const { bytes } = await recordingStorage();
  if (bytes + audio.length > limitBytes) return null;
  const doc = await RecordingModel.create({ interviewId, audio, mimeType, bytes: audio.length, durationSeconds });
  return doc._id;
}

export async function deleteRecordings(ids: (mongoose.Types.ObjectId | string | null | undefined)[]) {
  const present = ids.filter((id): id is mongoose.Types.ObjectId | string => Boolean(id));
  if (present.length) await RecordingModel.deleteMany({ _id: { $in: present } });
}

/** Admin: deletes recordings made before `before`, returning how many. */
export async function deleteRecordingsBefore(before: Date): Promise<number> {
  const { deletedCount } = await RecordingModel.deleteMany({ createdAt: { $lt: before } });
  return deletedCount;
}
