import { Request, Response } from 'express';
import createOrderService from '../../service/orders/create';

export default async function createOrderController(req: Request, res: Response) {
  let status = 200;
  let error = null;
  let response: any;

  try {
    const { handle, accessToken } = (res as any).locals.shopline.session;
    const body = typeof req.body === 'string' && req.body.trim() ? JSON.parse(req.body) : req.body;

    console.log('[orders/create] handle:', handle, 'payload:', JSON.stringify(body));
    response = await createOrderService(handle, accessToken, body);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;
  } catch (e: any) {
    console.error('[orders/create] Error:', e.message);
    status = 500;
    error = e.message;
  }

  res.status(status).json({ success: status === 200, error, data: response?.data });
}
