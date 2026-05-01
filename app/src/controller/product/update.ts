import { Request, Response } from 'express';
import updateProductService from '../../service/product/update';

export default async function updateProductController(req: Request, res: Response) {
  let status = 200;
  let error = null;
  let response: any;

  try {
    const { handle, accessToken } = (res as any).locals.shopline.session;
    const { id } = req.params;
    const body = typeof req.body === 'string' && req.body.trim() ? JSON.parse(req.body) : req.body;

    console.log('[products/update] id:', id, 'payload:', JSON.stringify(body));
    response = await updateProductService(handle, accessToken, id, body);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;
  } catch (e: any) {
    console.error('[products/update] Error:', e.message);
    status = 500;
    error = e.message;
  }

  res.status(status).json({ success: status === 200, error, data: response?.data });
}
