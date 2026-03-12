function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  REDIS_URL: getEnvVar("REDIS_URL", "redis://localhost:6379"),
  NEXT_PUBLIC_APP_URL: getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
} as const;
