import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

async function run() {
  const restUrl = `${url}/rest/v1/`;
  console.log("Fetching OpenAPI spec from:", restUrl);
  try {
    const response = await fetch(restUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const spec = await response.json();
    console.log("Successfully fetched OpenAPI schema!");
    
    // Let's filter paths/definitions for condominios or condominio
    console.log("Available definitions:");
    const definitions = spec.definitions || {};
    Object.keys(definitions).forEach(name => {
      if (name.includes("condo") || name.includes("perfi") || name.includes("unidad") || name.includes("morad")) {
        console.log(`\n--- Definition: ${name} ---`);
        console.log(JSON.stringify(definitions[name], null, 2));
      }
    });
  } catch (error) {
    console.error("Error fetching OpenAPI spec:", error);
  }
}

run();
