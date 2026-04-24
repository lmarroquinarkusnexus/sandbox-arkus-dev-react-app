const API_VERSION = 'v20230901';

export default async function listOrdersService(handle: string, token: string) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/orders/orders.json?limit=50&status=any`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return { status: res.status, data: await res.json() };
}
