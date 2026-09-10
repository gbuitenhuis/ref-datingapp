import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ref" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FAFAF9" />
        <title>Ref — meet through someone you trust</title>

        {/* ScrollViewStyleReset must come first so our overrides win */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
                -webkit-text-size-adjust: 100%;
                touch-action: manipulation;
                overscroll-behavior: none;
                -webkit-overflow-scrolling: touch;
              }

              /* Prevent iOS zoom-on-focus for text inputs */
              input, textarea, select {
                font-size: max(16px, 1em) !important;
              }

              * {
                -webkit-tap-highlight-color: transparent;
              }

              /* ── Desktop: show app inside a phone frame ── */
              @media (min-width: 520px) {
                html {
                  background: #0f0f14 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                }

                body {
                  width: 393px !important;
                  height: min(852px, 96vh) !important;
                  border-radius: 48px !important;
                  overflow: hidden !important;
                  box-shadow:
                    0 0 0 10px #1c1c1e,
                    0 0 0 11px #3a3a3c,
                    0 40px 120px rgba(0, 0, 0, 0.7) !important;
                }

                #root {
                  border-radius: 48px !important;
                  overflow: hidden !important;
                }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
