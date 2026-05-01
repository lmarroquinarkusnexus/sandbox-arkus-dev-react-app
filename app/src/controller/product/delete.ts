import { Request, Response } from 'express';
import deleteProductService from '../../service/product/delete';

export default async function deleteProductController(req: Request, res: Response) {
  let status = 200;
  let error = null;
  let response: any;

  try {
    const { handle, accessToken } = (res as any).locals.shopline.session;
    const { id } = req.params;

    console.log('[products/delete] id:', id);
    response = await deleteProductService(handle, accessToken, id);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;
  } catch (e: any) {
    console.error('[products/delete] Error:', e.message);
    status = 500;
    error = e.message;
  }

  res.status(status).json({ success: status === 200, error, data: response?.data });
}
