import listProductsService from '../products/list';
import listOrdersService from '../orders/list';
import listCustomersService from '../customers/list';

export default async function statsService(handle: string, token: string) {
  const [products, orders, customers] = await Promise.all([
    listProductsService(handle, token),
    listOrdersService(handle, token),
    listCustomersService(handle, token),
  ]);

  return {
    products: products.data?.products?.length ?? 0,
    orders: orders.data?.orders?.length ?? 0,
    customers: customers.data?.customers?.length ?? 0,
  };
}
