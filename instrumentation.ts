export function register() {
  // Track app start when the config is loaded (development)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      try {
        await fetch(`${process.env.BASE_URL}/api/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'app_start_success' }),
        });
      } catch (error) {
        console.error('❌ Failed to track app start success:', error);
      }
    }, 1000);
  }
}
