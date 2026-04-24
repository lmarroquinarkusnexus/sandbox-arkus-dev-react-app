import { Request, Response } from 'express';
import statsService from '../../service/stats/index';

export default async function statsController(_req: Request, res: Response) {
  const { handle, accessToken } = res.locals.shopline.session;
  const result = await statsService(handle, accessToken);
  res.status(200).json(result);
}
