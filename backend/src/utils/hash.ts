import crypto from "node:crypto";

export const sha256 = (value: string): string => {
  return crypto.createHash("sha256").update(value).digest("hex");
};
