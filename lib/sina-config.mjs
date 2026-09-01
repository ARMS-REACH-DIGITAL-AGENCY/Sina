import { createHash, timingSafeEqual } from 'node:crypto';

export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1yTKJUw-OjpI6V2wxUtfSVq61b3NV3g9EcaZxsUEbfBY/export?format=csv&gid=1901402257";
const ADMIN_KEY_SHA256 = 'b93eb019b153a69c5d975796995c2745f969cb2c0fa8a3f955ccdf3c72b42a8e';

export function isAdminKeyValid(value) {
  if (!value) return false;
  const actual = createHash('sha256').update(String(value)).digest();
  const expected = Buffer.from(ADMIN_KEY_SHA256, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
