const API_VERSION = 'v20230901';

interface CustomerUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export default async function updateCustomerService(
  handle: string,
  token: string,
  id: string | number,
  data: CustomerUpdateData,
) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/customers/${id}.json`;
  console.log('[updateCustomerService] PUT', url);

  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer: { id, ...data } }),
  });

  console.log('[updateCustomerService] status:', response.status);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }
  return { status: response.status, data: await response.json() };
}
