import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type AppleAppSiteAssociation = {
  webcredentials?: { apps?: string[] };
};

const raw = readFileSync(
  path.resolve(process.cwd(), 'public/.well-known/apple-app-site-association'),
  'utf-8',
);

describe('apple-app-site-association', () => {
  it('parses as JSON', () => {
    expect(() => JSON.parse(raw) as AppleAppSiteAssociation).not.toThrow();
  });

  it('grants webcredentials to the NinerLog iOS app, and to nothing else', () => {
    const aasa = JSON.parse(raw) as AppleAppSiteAssociation;
    expect(aasa.webcredentials?.apps).toEqual(['2RDQVM5KSC.com.ninerlog.app']);
  });
});
