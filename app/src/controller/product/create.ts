import createProductService from '../../service/product/create';

export default async function createProductController(req, res) {
  let status = 200;
  let error = null;
  let response;

  try {
    const { handle, accessToken } = res.locals.shopline.session;
    const productData = typeof req.body === 'string' && req.body.trim() ? JSON.parse(req.body) : req.body;
    console.log('[products/create] payload:', JSON.stringify(productData));
    response = await createProductService(handle, accessToken, productData);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;
  } catch (e) {
    console.error(`[products/create] Error: ${e.message}`);
    status = 500;
    error = e.message;
  }

  res.status(status).json({ success: status === 200, error, data: response?.data });
}
