const API_VERSION = 'v20230901';

export default async function listCustomersService(handle: string, token: string) {
  const url = `https://${handle}.myshopline.com/admin/openapi/${API_VERSION}/customers/customers.json?limit=50`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return { status: res.status, data: await res.json() };
}
