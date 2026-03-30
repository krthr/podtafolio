// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  runtimeConfig: {
    // Database
    databaseUrl: "",

    // Groq (transcription)
    groqApiKey: "",

    // Google Gemini (analysis + synthesis) — used via Vercel AI SDK
    googleGenerativeAiApiKey: "",

    // Podcast Index API
    podcastIndexApiKey: "",
    podcastIndexApiSecret: "",

    // Redis (BullMQ)
    redisUrl: "",


    // Object storage (R2/S3-compatible)
    s3Endpoint: "",
    s3Region: "",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Bucket: "",
  },
});
