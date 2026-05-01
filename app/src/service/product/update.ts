const API_VERSION = 'v20230901';

interface ProductUpdateData {
  title?: string;
  body_html?: string;
  price?: string;
  inventory_quantity?: number;
  status?: 'active' | 'draft' | 'archived';
}

export default async function updateProductService(
  handle: string,
  token: string,
  id: string | number,
  data: ProductUpdateData,
) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/products/${id}.json`;
  console.log('[updateProductService] PUT', url);

  const body: any = { product: { id } };
  if (data.title !== undefined) body.product.title = data.title;
  if (data.body_html !== undefined) body.product.body_html = data.body_html;
  if (data.status !== undefined) body.product.status = data.status;
  if (data.price !== undefined || data.inventory_quantity !== undefined) {
    body.product.variants = [{}];
    if (data.price !== undefined) body.product.variants[0].price = data.price;
    if (data.inventory_quantity !== undefined) body.product.variants[0].inventory_quantity = data.inventory_quantity;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('[updateProductService] status:', response.status);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }
  return { status: response.status, data: await response.json() };
}
