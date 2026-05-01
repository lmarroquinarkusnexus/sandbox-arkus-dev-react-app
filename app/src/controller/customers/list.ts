import { Request, Response } from 'express';
import listCustomersService from '../../service/customers/list';

export default async function listCustomersController(_req: Request, res: Response) {
  try {
    const { handle, accessToken } = res.locals.shopline.session;
    console.log('[customers/list] handle:', handle);
    const result = await listCustomersService(handle, accessToken);
    console.log('[customers/list] Shopline status:', result.status);
    res.status(result.status).json(result.data);
  } catch (e) {
    console.error('[customers/list] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
