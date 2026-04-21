import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

/**
 * Report Core Web Vitals metrics.
 * In production, these can be sent to an analytics endpoint.
 * During development, they're logged to the console.
 */
function reportWebVital(metric: Metric) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  // In production, send to analytics if configured
  const analyticsUrl = (window as unknown as Record<string, unknown>).__NINERLOG_ANALYTICS_URL__ as string | undefined;
  if (analyticsUrl && import.meta.env.PROD) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    });

    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(analyticsUrl, body);
    }
  }
}

export function initWebVitals() {
  onCLS(reportWebVital);
  onFCP(reportWebVital);
  onLCP(reportWebVital);
  onTTFB(reportWebVital);
}
