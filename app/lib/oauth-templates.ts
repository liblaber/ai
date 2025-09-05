// OAuth callback HTML templates

interface OAuthCallbackData {
  type: 'success' | 'error';
  data?: any;
  error?: string;
}

export function generateOAuthCallbackHTML({ type, data, error }: OAuthCallbackData): string {
  const messageData =
    type === 'success'
      ? {
          type: 'GOOGLE_AUTH_SUCCESS',
          ...data,
        }
      : {
          type: 'GOOGLE_AUTH_ERROR',
          error,
        };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type === 'success' ? 'Authentication Successful' : 'Authentication Error'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .success { color: #059669; }
    .error { color: #dc2626; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="${type === 'success' ? 'success' : 'error'}">
      ${type === 'success' ? '✓ Authentication Successful' : '✗ Authentication Failed'}
    </h1>
    <p>This window will close automatically...</p>
  </div>

  <script>
    (function() {
      try {
        const messageData = ${JSON.stringify(messageData)};
        if (window.opener) {
          window.opener.postMessage(messageData, window.location.origin);
        }
      } catch (error) {
        console.error('Failed to send message to parent window:', error);
      }
      
      // Close window after a brief delay
      setTimeout(() => {
        window.close();
      }, 1000);
    })();
  </script>
</body>
</html>`.trim();
}
