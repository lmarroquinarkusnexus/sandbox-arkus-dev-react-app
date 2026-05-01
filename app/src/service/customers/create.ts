const API_VERSION = 'v20230901';

interface CustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export default async function createCustomerService(handle: string, token: string, customerData: CustomerData) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/customers.json`;

  console.log('[createCustomerService] POST', url);
  console.log('[createCustomerService] body:', JSON.stringify({ customer: customerData }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer: customerData }),
  });

  console.log('[createCustomerService] response status:', response.status);
  console.log('[createCustomerService] content-type:', response.headers.get('content-type'));

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — respuesta no es JSON. Primeros 300 chars: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  return { status: response.status, data };
}
