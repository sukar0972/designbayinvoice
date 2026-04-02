function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: requirePublicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
};
