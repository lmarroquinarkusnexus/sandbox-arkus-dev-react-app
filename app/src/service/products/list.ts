const API_VERSION = 'v20230901';

export default async function listProductsService(handle: string, token: string) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/products/products.json?limit=50`;
  console.log('[listProductsService] GET', url);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[listProductsService] status:', res.status, '| content-type:', res.headers.get('content-type'));

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Shopline API HTTP ${res.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }

  return { status: res.status, data: await res.json() };
}
