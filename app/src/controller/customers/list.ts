import { Request, Response } from 'express';
import listCustomersService from '../../service/customers/list';

export default async function listCustomersController(_req: Request, res: Response) {
  const { handle, accessToken } = res.locals.shopline.session;
  const result = await listCustomersService(handle, accessToken);
  res.status(result.status).json(result.data);
}
