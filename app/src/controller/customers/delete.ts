import { Request, Response } from 'express';
import deleteCustomerService from '../../service/customers/delete';

export default async function deleteCustomerController(req: Request, res: Response) {
  let status = 200;
  let error = null;
  let response: any;

  try {
    const { handle, accessToken } = (res as any).locals.shopline.session;
    const { id } = req.params;

    console.log('[customers/delete] id:', id);
    response = await deleteCustomerService(handle, accessToken, id);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;
  } catch (e: any) {
    console.error('[customers/delete] Error:', e.message);
    status = 500;
    error = e.message;
  }

  res.status(status).json({ success: status === 200, error, data: response?.data });
}
