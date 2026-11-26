import { ApiError, createCalculatorClient } from './calculatorApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createCalculatorClient', () => {
  it('posts operands to the operation endpoint and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ operation: 'add', operands: [2, 3], result: 5 }));
    const calculate = createCalculatorClient('http://api.test', fetchMock);

    await expect(calculate('add', [2, 3])).resolves.toEqual({ operation: 'add', operands: [2, 3], result: 5 });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/operations/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operands: [2, 3] }),
    });
  });

  it('maps API error bodies to ApiError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'division by zero' } }, 422),
    );
    const err = await createCalculatorClient('', fetchMock)('divide', [1, 0]).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'DIVISION_BY_ZERO', message: 'division by zero', status: 422 });
  });

  it('falls back to a generic error when the error body has no details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    await expect(createCalculatorClient('', fetchMock)('add', [1, 2])).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      status: 500,
    });
  });

  it('reports network failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createCalculatorClient('', fetchMock)('add', [1, 2])).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('reports non-JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));
    await expect(createCalculatorClient('', fetchMock)('add', [1, 2])).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    });
  });

  it('rejects success responses without a numeric result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: 'five' }));
    await expect(createCalculatorClient('', fetchMock)('add', [2, 3])).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
});
