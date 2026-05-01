import createCustomerService from '../../service/customers/create';

export default async function createCustomerController(req, res) {
  let status = 200;
  let error = null;
  let response;

  try {
    const { handle, accessToken } = res.locals.shopline.session;

    // express.text({ type: '*/*' }) deja el body como string — parseamos manualmente
    let customerData;
    if (typeof req.body === 'string' && req.body.trim()) {
      customerData = JSON.parse(req.body);
    } else if (typeof req.body === 'object' && req.body !== null) {
      customerData = req.body;
    } else {
      throw new Error('Empty or invalid request body');
    }

    console.log('[customers/create] handle:', handle);
    console.log('[customers/create] payload:', JSON.stringify(customerData));

    response = await createCustomerService(handle, accessToken, customerData);
    status = response.status >= 200 && response.status <= 299 ? 200 : 400;

    console.log('[customers/create] Shopline API status:', response.status);

  } catch (e) {
    console.error(`[customers/create] Error: ${e.message}`);
    status = 500;
    error = e.message;
  }

  res.status(status).send({ success: status === 200, error, data: response?.data });
}
