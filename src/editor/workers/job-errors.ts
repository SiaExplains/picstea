import type { Message, Msg } from "../core/message";
import { FormatError } from "../formats/binary/bytes";
import { ExportError } from "../formats/export/raster-export";

/** A job's error as it crosses from the worker to the UI thread (structured-clone safe). */
export interface JobError {
  readonly name: string;
  readonly message: string;
  /** The translatable template of a user-facing error (ADR-0039). */
  readonly template?: Msg;
}

export const toJobError = (error: unknown): JobError => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message : String(error),
  ...(error instanceof FormatError || error instanceof ExportError
    ? error.template && { template: error.template }
    : {}),
});

export function fromJobError(error: JobError): Error {
  const message: Message = error.template ?? error.message;
  if (error.name === "FormatError") return new FormatError(message);
  if (error.name === "ExportError") return new ExportError(message);
  const e = new Error(error.message);
  e.name = error.name;
  return e;
}
