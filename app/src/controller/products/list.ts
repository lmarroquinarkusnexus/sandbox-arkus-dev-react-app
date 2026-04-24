import { Request, Response } from 'express';
import listProductsService from '../../service/products/list';

export default async function listProductsController(_req: Request, res: Response) {
  const { handle, accessToken } = res.locals.shopline.session;
  const result = await listProductsService(handle, accessToken);
  res.status(result.status).json(result.data);
}
