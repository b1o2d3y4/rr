const TARGET_URL = process.env.KEEPALIVE_URL || 'https://aqel-age-calculator-u1lp.arcada.app';
const INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS || 5 * 60 * 1000);

async function ping() {
  const now = new Date().toISOString();

  try {
    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'render-keepalive/1.0',
      },
    });

    console.log(`[${now}] ping ok -> ${TARGET_URL} | status: ${response.status}`);
  } catch (error) {
    console.error(`[${now}] ping failed -> ${TARGET_URL}`);
    console.error(error.message);
  }
}

ping();
setInterval(ping, INTERVAL_MS);
