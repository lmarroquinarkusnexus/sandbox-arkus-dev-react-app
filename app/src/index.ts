import express from 'express';
import { join } from 'path';
import shopline from './shopline';
import { readFileSync } from 'fs';
import serveStatic from 'serve-static';
import { webhooksController } from './controller/webhook';
import createProductController from './controller/product/create';
import updateProductController from './controller/product/update';
import deleteProductController from './controller/product/delete';
import createCustomerController from './controller/customers/create';
import updateCustomerController from './controller/customers/update';
import deleteCustomerController from './controller/customers/delete';
import listProductsController from './controller/products/list';
import createOrderController from './controller/orders/create';
import listOrdersController from './controller/orders/list';
import listCustomersController from './controller/customers/list';
import statsController from './controller/stats/index';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
  process.env.NODE_ENV === 'production'
    ? `${process.cwd()}/../web/dist`
    : `${process.cwd()}/../web`;

const app = express();

app.get(shopline.config.auth.path, shopline.auth.begin());

app.get(shopline.config.auth.callbackPath, shopline.auth.callback(), shopline.redirectToAppHome());
app.post('/api/webhooks', express.text({ type: '*/*' }), webhooksController());

// api path for frontend/vite.config
app.use('/api/*', express.text({ type: '*/*' }), shopline.validateAuthentication());

app.post('/api/products/create', createProductController);
app.put('/api/products/:id', updateProductController);
app.delete('/api/products/:id', deleteProductController);
app.post('/api/customers/create', createCustomerController);
app.put('/api/customers/:id', updateCustomerController);
app.delete('/api/customers/:id', deleteCustomerController);
app.get('/api/products', listProductsController);
app.post('/api/orders/create', createOrderController);
app.get('/api/orders', listOrdersController);
app.get('/api/customers', listCustomersController);
app.get('/api/stats', statsController);

app.use(shopline.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use('/*', shopline.confirmInstallationStatus(), async (_req, res, _next) => {
  return res
    .status(200)
    .set('Content-Type', 'text/html')
    .send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT);
console.log(PORT);
