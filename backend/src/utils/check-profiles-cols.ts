import { config } from '../config/index.js';

async function run() {
  const url = config.SUPABASE_URL;
  const apiKey = config.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const schema = await response.json() as any;
    console.log("=== Available DB Tables ===");
    console.log(Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
