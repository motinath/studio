export function renderErrorPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Application Error — Silicofeller</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #F8FAFC;
            color: #0F172A;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 500px;
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.03);
            border: 1px solid #E2E8F0;
          }
          h1 {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          p {
            font-size: 14px;
            color: #64748B;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .btn {
            display: inline-block;
            background-color: #7C3AED;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(124,58,237,0.15);
            transition: all 0.15s ease;
          }
          .btn:hover {
            background-color: #6D28D9;
            transform: translateY(-1px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h1>Render Error</h1>
          <p>A rendering mismatch or initialization error occurred while building the page on the server. Please reload or head back home.</p>
          <a href="/" class="btn">Reload page</a>
        </div>
      </body>
    </html>
  `;
}
