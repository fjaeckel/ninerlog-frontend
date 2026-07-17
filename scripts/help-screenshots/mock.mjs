/**
 * Installs a Playwright network mock for the NinerLog API on a page, so the
 * real app renders fully-populated real screens with no backend running.
 * Dev-tooling only — never imported by the app itself.
 */

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function paginated(list, url) {
  const pageSize = Number(url.searchParams.get('pageSize') || '20');
  const page = Number(url.searchParams.get('page') || '1');
  return {
    data: list.slice(0, pageSize),
    pagination: { page, pageSize, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / pageSize)) },
  };
}

/**
 * `state` is a mutable plain object holding the current fixture data for a
 * capture (aircraft, flights, licenses, credentials, currencyStatus,
 * statistics, statsByClass, trends, flightSession, signaturesByFlight,
 * classRatingsByLicense). Figures may mutate a clone before installing.
 */
export async function installApiMocks(page, state) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (!url.pathname.includes('/api/v1/') && url.pathname !== '/beta-verify') {
      return route.continue();
    }

    if (url.pathname === '/beta-verify') {
      return json(route, 200, {});
    }

    const path = url.pathname.split('/api/v1')[1] || '';
    const segs = path.split('/').filter(Boolean);

    // /flights, /flights/:id, /flights/:id/signatures
    if (segs[0] === 'flights') {
      if (segs.length === 1 && method === 'GET') return json(route, 200, paginated(state.flights, url));
      if (segs.length === 1 && method === 'POST') {
        return json(route, 201, { id: `fl-new-${Date.now()}`, userId: state.user.id, ...JSON.parse(request.postData() || '{}') });
      }
      if (segs.length === 2 && method === 'GET') {
        const flight = state.flights.find((f) => f.id === segs[1]);
        return flight ? json(route, 200, flight) : json(route, 404, { error: 'Not found' });
      }
      if (segs.length === 2 && (method === 'PUT' || method === 'PATCH')) {
        const flight = state.flights.find((f) => f.id === segs[1]);
        return json(route, 200, { ...flight, ...JSON.parse(request.postData() || '{}') });
      }
      if (segs.length === 3 && segs[2] === 'signatures' && method === 'GET') {
        return json(route, 200, state.signaturesByFlight[segs[1]] || []);
      }
      if (segs.length >= 3 && segs[2] === 'signatures' && method === 'POST') {
        return json(route, 201, { id: 'sig-new', flightId: segs[1], status: 'completed', method: 'live' });
      }
    }

    // /aircraft
    if (segs[0] === 'aircraft') {
      if (segs.length === 1 && method === 'GET') return json(route, 200, paginated(state.aircraft, url));
      if (segs.length === 1 && method === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        return json(route, 201, { id: `ac-new-${Date.now()}`, userId: state.user.id, isActive: true, ...body });
      }
    }

    // /licenses, /licenses/:id/ratings, /licenses/:id/currency
    if (segs[0] === 'licenses') {
      if (segs.length === 1 && method === 'GET') return json(route, 200, state.licenses);
      if (segs.length === 3 && segs[2] === 'ratings' && method === 'GET') {
        return json(route, 200, state.classRatingsByLicense[segs[1]] || []);
      }
      if (segs.length === 3 && segs[2] === 'currency' && method === 'GET') {
        return json(route, 200, { licenseId: segs[1], isCurrent: true, daysCurrent: true, nightsCurrent: true, last90Days: { flights: 5, totalLandings: 6, dayLandings: 5, nightLandings: 1 }, requiredLandings: { day: 3, night: 3 }, expiryDate: null });
      }
    }

    // /credentials
    if (segs[0] === 'credentials') {
      if (segs.length === 1 && method === 'GET') return json(route, 200, state.credentials);
    }

    // /currency (all)
    if (segs[0] === 'currency' && segs.length === 1 && method === 'GET') {
      return json(route, 200, state.currencyStatus);
    }

    // /users/me/statistics, /users/me/notifications*
    if (segs[0] === 'users' && segs[1] === 'me') {
      if (segs[2] === 'statistics' && method === 'GET') return json(route, 200, state.statistics);
      if (segs[2] === 'notifications' && segs.length === 3 && method === 'GET') return json(route, 200, { preferences: {} });
      if (segs[2] === 'notifications' && segs[3] === 'history') return json(route, 200, { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
    }

    // /reports/*
    if (segs[0] === 'reports') {
      if (segs[1] === 'stats-by-class' && method === 'GET') return json(route, 200, state.statsByClass);
      if (segs[1] === 'trends' && method === 'GET') return json(route, 200, state.trends);
    }

    // /flight-sessions/current[/events]
    if (segs[0] === 'flight-sessions' && segs[1] === 'current') {
      if (segs.length === 2 && method === 'GET') {
        return state.flightSession ? json(route, 200, state.flightSession) : json(route, 404, { error: 'No open session' });
      }
      if (segs[2] === 'events' && method === 'POST') return json(route, 200, state.flightSession || {});
      if (segs.length === 2 && method === 'DELETE') return json(route, 204, {});
    }

    // /auth/webauthn/credentials (passkeys list)
    if (path === '/auth/webauthn/credentials' && method === 'GET') {
      return json(route, 200, []);
    }

    // /announcements
    if (segs[0] === 'announcements' && method === 'GET') {
      return json(route, 200, { announcements: [], hints: [] });
    }

    // /contacts
    if (segs[0] === 'contacts') {
      if (segs[1] === 'search') return json(route, 200, []);
      if (segs.length === 1 && method === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        return json(route, 201, { id: `ct-new-${Date.now()}`, userId: state.user.id, ...body });
      }
    }

    // Fallback: keep the app alive for anything else we didn't anticipate.
    if (method === 'GET') return json(route, 200, {});
    return json(route, 200, {});
  });
}
