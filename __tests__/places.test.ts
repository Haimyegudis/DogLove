import { nearbyPlaces } from '../src/services/places';

const SAMPLE_OVERPASS = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 32.1,
      lon: 34.8,
      tags: { name: 'וטרינר', amenity: 'veterinary' },
    },
  ],
};

const SAMPLE_WAY = {
  elements: [
    {
      type: 'way',
      id: 2,
      center: { lat: 32.2, lon: 34.9 },
      tags: { name: 'גן כלבים' },
    },
  ],
};

const originalFetch = global.fetch;

afterEach(() => {
  // @ts-ignore
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function mockFetch(data: object, ok = true, status = 200) {
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

// ── 1. Happy path: node element ─────────────────────────────────────────────
test('nearbyPlaces returns parsed Place rows for a vet node', async () => {
  mockFetch(SAMPLE_OVERPASS);
  const { data, error } = await nearbyPlaces(32.1, 34.8, 'vet');

  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ id: 1, name: 'וטרינר', lat: 32.1, lng: 34.8, kind: 'vet' });
});

// ── 2. Way element (center coords) ──────────────────────────────────────────
test('nearbyPlaces parses way elements using center coords', async () => {
  mockFetch(SAMPLE_WAY);
  const { data, error } = await nearbyPlaces(32.2, 34.9, 'park');

  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data[0].lat).toBeCloseTo(32.2);
  expect(data[0].lng).toBeCloseTo(34.9);
});

// ── 3. OQL body contains correct tag for each kind ──────────────────────────
test('nearbyPlaces POSTs a body containing the right OSM tag for vet', async () => {
  mockFetch({ elements: [] });
  await nearbyPlaces(32.0, 35.0, 'vet', 3000);

  // @ts-ignore
  const body: string = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toContain('"amenity"="veterinary"');
  // Vets are sparse, so the radius is widened to at least 15km.
  expect(body).toContain('15000');
});

test('nearbyPlaces POSTs a body containing dog_park tag for park', async () => {
  mockFetch({ elements: [] });
  await nearbyPlaces(32.0, 35.0, 'park');

  // @ts-ignore
  const body: string = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toContain('"leisure"="dog_park"');
});

test('nearbyPlaces POSTs a body containing shop=pet tag for petshop', async () => {
  mockFetch({ elements: [] });
  await nearbyPlaces(32.0, 35.0, 'petshop');

  // @ts-ignore
  const body: string = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toContain('"shop"="pet"');
});

// ── 4. Default radius is 5000 ────────────────────────────────────────────────
test('nearbyPlaces uses default radius 5000 when not supplied', async () => {
  mockFetch({ elements: [] });
  await nearbyPlaces(32.0, 35.0, 'petshop');

  // @ts-ignore
  const body: string = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toContain('5000');
});

// ── 5. Missing-coord elements are filtered out ───────────────────────────────
test('nearbyPlaces filters out elements without coordinates', async () => {
  mockFetch({
    elements: [
      { type: 'way', id: 99, tags: { name: 'missing' } }, // no lat/lon/center
      { type: 'node', id: 100, lat: 32.5, lon: 34.7, tags: {} },
    ],
  });
  const { data } = await nearbyPlaces(32.5, 34.7, 'vet');
  expect(data).toHaveLength(1);
  expect(data[0].id).toBe(100);
});

// ── 6. Missing name falls back to Hebrew placeholder ─────────────────────────
test('nearbyPlaces uses a kind-based Hebrew name when tags.name is absent', async () => {
  mockFetch({
    elements: [{ type: 'node', id: 5, lat: 32.1, lon: 34.8, tags: {} }],
  });
  const vet = await nearbyPlaces(32.1, 34.8, 'vet');
  expect(vet.data[0].name).toBe('מרפאה וטרינרית');

  mockFetch({ elements: [{ type: 'node', id: 6, lat: 32.1, lon: 34.8, tags: { leisure: 'dog_park' } }] });
  const park = await nearbyPlaces(32.1, 34.8, 'park');
  expect(park.data[0].name).toBe('גינת כלבים');
});

// ── 7. HTTP error (non-ok response) ──────────────────────────────────────────
test('nearbyPlaces returns error string when server responds with non-ok status', async () => {
  mockFetch({}, false, 429);
  const { data, error } = await nearbyPlaces(32.0, 35.0, 'vet');

  expect(data).toHaveLength(0);
  expect(error).toContain('429');
});

// ── 8. Network / fetch rejection ─────────────────────────────────────────────
test('nearbyPlaces returns error string when fetch rejects', async () => {
  // @ts-ignore
  global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
  const { data, error } = await nearbyPlaces(32.0, 35.0, 'vet');

  expect(data).toHaveLength(0);
  expect(error).toBe('Network request failed');
});

// ── 9. Form-encoded request to an Overpass mirror ────────────────────────────
test('nearbyPlaces POSTs form-encoded data to an Overpass mirror', async () => {
  mockFetch({ elements: [] });
  await nearbyPlaces(32.0, 35.0, 'vet');

  // @ts-ignore
  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toContain('/api/interpreter');
  expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(opts.body.startsWith('data=')).toBe(true);
});
