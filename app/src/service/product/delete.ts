const API_VERSION = 'v20230901';

export default async function deleteProductService(
  handle: string,
  token: string,
  id: string | number,
) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/products/${id}.json`;
  console.log('[deleteProductService] DELETE', url);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log('[deleteProductService] status:', response.status);
  // DELETE may return 200 with body or 204 with no body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { status: response.status, data: {} };
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }
  return { status: response.status, data: await response.json() };
}
