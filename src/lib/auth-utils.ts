import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

// Function to verify a password against a hash
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hashedPassword);
  return isValid;
}
