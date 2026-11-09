import { MongoBinary } from "mongodb-memory-server";

export async function setup() {
  await MongoBinary.getPath();
}
