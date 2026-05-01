const API_VERSION = 'v20230901';

export interface LineItemInput {
  title: string;
  price: string;
  quantity: number;
  product_id?: string;
  variant_id?: string;
}

export interface OrderInput {
  line_items: LineItemInput[];
  customer?: { id: string; first_name?: string; last_name?: string; email?: string };
  shipping_address?: {
    first_name: string; last_name: string;
    address1: string; city: string;
    country_code: string; zip: string; phone?: string;
  };
  financial_status?: 'unpaid' | 'paid';
  shipping_price?: string;
  discount?: string;
  order_note?: string;
}

export default async function createOrderService(handle: string, token: string, input: OrderInput) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/orders.json`;
  console.log('[createOrderService] POST', url);

  const body: any = {
    order: {
      inventory_behaviour: 'bypass',
      line_items: input.line_items.map((item) => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        ...(item.product_id ? { product_id: item.product_id } : {}),
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
      })),
      price_info: {
        total_shipping_price: input.shipping_price ?? '0.00',
        current_extra_total_discounts: input.discount ?? '0.00',
      },
    },
  };

  if (input.customer) body.order.customer = input.customer;
  if (input.shipping_address) body.order.shipping_address = input.shipping_address;
  if (input.financial_status) body.order.financial_status = input.financial_status;
  if (input.order_note) body.order.order_note = input.order_note;

  console.log('[createOrderService] body:', JSON.stringify(body));

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('[createOrderService] status:', response.status);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Shopline API HTTP ${response.status} — no JSON. Preview: ${text.slice(0, 300)}`);
  }

  return { status: response.status, data: await response.json() };
}
