const API_VERSION = 'v20230901';

interface ProductData {
  title: string;
  body_html?: string;
  price?: string;
  inventory_quantity?: number;
  status?: 'active' | 'draft' | 'archived';
}

export default async function createProductService(handle: string, token: string, productData: ProductData) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/products/products.json`;
  const body = {
    product: {
      title: productData.title,
      body_html: productData.body_html ?? '',
      status: productData.status ?? 'active',
      variants: [
        {
          price: productData.price ?? '0.00',
          inventory_quantity: productData.inventory_quantity ?? 0,
        },
      ],
    },
  };

  console.log('[createProductService] POST', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[createProductService] status:', response.status);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  return { status: response.status, data };
}
