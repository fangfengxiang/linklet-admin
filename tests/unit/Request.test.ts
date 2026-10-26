import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { transport, mockTransport } = vi.hoisted(() => ({ transport: vi.fn(), mockTransport: vi.fn() }));
vi.mock('@umijs/max', () => ({ request: transport }));
vi.mock('@/mock/dispatch', () => ({ mockRequest: mockTransport }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MOCK', '0');
  transport.mockReset();
  mockTransport.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('typed backend error boundary', () => {
  it('unwraps the real backend without touching the mock transport', async () => {
    transport.mockResolvedValue({ code: 0, message: 'success', data: [{ id: 1 }] });
    const { fetchAPI } = await import('@/services/request');
    expect(await fetchAPI('/api/v1/admin/tenant/list')).toEqual([{ id: 1 }]);
    expect(mockTransport).not.toHaveBeenCalled();
  });
  it('preserves business error codes and messages from non-2xx envelopes', async () => {
    transport.mockRejectedValue({ response: { status: 409,
      data: { code: 4009, message: 'domain is still bound', data: null } } });
    const { fetchAPI } = await import('@/services/request');
    await expect(fetchAPI('/api/v1/admin/domain/disable')).rejects.toMatchObject({
      name: 'DomainError', code: 4009, message: 'domain is still bound', httpStatus: 409,
    });
    expect(mockTransport).not.toHaveBeenCalled();
  });
  it('preserves envelopes returned with HTTP 200 and rejects malformed successes', async () => {
    const { fetchAPI } = await import('@/services/request');
    transport.mockResolvedValueOnce({ code: 403, message: 'not authorized', data: null });
    await expect(fetchAPI('/api')).rejects.toMatchObject({ code: 403, message: 'not authorized' });
    transport.mockResolvedValueOnce([]);
    await expect(fetchAPI('/api')).rejects.toMatchObject({ code: 502 });
  });
  it('reports HTTP/network failures without falling back to demonstration data', async () => {
    const { fetchAPI } = await import('@/services/request');
    transport.mockRejectedValueOnce({ response: { status: 401, data: '<html>unauthorized</html>' } });
    await expect(fetchAPI('/api')).rejects.toMatchObject({ code: 401, httpStatus: 401 });
    transport.mockRejectedValueOnce(new Error('network failed'));
    await expect(fetchAPI('/api')).rejects.toMatchObject({ code: 503 });
    expect(mockTransport).not.toHaveBeenCalled();
  });
  it('keeps demonstration mode explicit and never calls the network for missing mocks', async () => {
    vi.stubEnv('MOCK', '1');
    const { fetchAPI } = await import('@/services/request');
    mockTransport.mockReturnValueOnce({ code: 0, message: 'success', data: [] });
    expect(await fetchAPI('/api/v1/admin/group/list')).toEqual([]);
    mockTransport.mockReturnValueOnce(null);
    await expect(fetchAPI('/missing')).rejects.toMatchObject({ code: 404 });
    expect(transport).not.toHaveBeenCalled();
  });
});
