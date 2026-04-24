import { Request, Response } from 'express';
import listOrdersService from '../../service/orders/list';

export default async function listOrdersController(_req: Request, res: Response) {
  const { handle, accessToken } = res.locals.shopline.session;
  const result = await listOrdersService(handle, accessToken);
  res.status(result.status).json(result.data);
}
