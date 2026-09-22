import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { db } from './db.js';
import { authRouter } from './routes/auth.js';
import { navigationRouter } from './routes/navigation.js';
import { accessRouter } from './routes/access.js';
import { projectsRouter } from './routes/projects.js';
import { projectSitesRouter } from './routes/project-sites.js';
import { assignmentsRouter } from './routes/assignments.js';
import { employeesRouter } from './routes/employees.js';
import { expensesRouter } from './routes/expenses.js';
import { sitePurchasesRouter } from './routes/site-purchases.js';
import { corporatePurchasesRouter } from './routes/corporate-purchases.js';
import { corporateTransfersRouter } from './routes/corporate-transfers.js';
import { masterDataRouter } from './routes/master-data.js';
import { usersRouter } from './routes/users.js';
import { menusRouter } from './routes/menus.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/navigation', navigationRouter);
app.use('/api/access', accessRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/project-sites', projectSitesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/site-purchases', sitePurchasesRouter);
app.use('/api/corporate-purchases', corporatePurchasesRouter);
app.use('/api/corporate-transfers', corporateTransfersRouter);
app.use('/api/master-data', masterDataRouter);
app.use('/api/users', usersRouter);
app.use('/api/menus', menusRouter);

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

app.listen(config.PORT, () => console.log(`TMS API listening on http://localhost:${config.PORT}`));
