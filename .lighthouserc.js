module.exports = {
  ci: {
    collect: {
      // Run against local production build
      startServerCommand: 'npx vite preview --port 4173',
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 15000,
      url: [
        'http://localhost:4173/',           // Login page
        'http://localhost:4173/dashboard',  // Dashboard (requires auth, tests shell)
        'http://localhost:4173/flights',    // Flights list
        'http://localhost:4173/reports',    // Reports
      ],
      numberOfRuns: 3,
      settings: {
        // Use performance-focused settings
        preset: 'desktop',
        // Skip auth-dependent audits
        skipAudits: ['redirects-http'],
      },
    },
    assert: {
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.90 }],
        // Accessibility
        'categories:accessibility': ['warn', { minScore: 0.90 }],
        // Best Practices
        'categories:best-practices': ['warn', { minScore: 0.90 }],
        // SEO
        'categories:seo': ['warn', { minScore: 0.80 }],
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
      },
    },
    upload: {
      // Store results locally (no external server)
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
