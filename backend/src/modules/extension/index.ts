import { Router } from 'express';
import pairingRoutes from './routes/pairing.routes.js';
import autofillRoutes from './routes/autofill.routes.js';

import { extensionResumeRouter } from './routes/resume.routes.js';
import { extensionAnswersRouter } from './routes/answers.routes.js';

const extensionRouter = Router();

// Mount all extension-related routes here
extensionRouter.use('/', pairingRoutes);
extensionRouter.use('/', autofillRoutes);
extensionRouter.use('/', extensionResumeRouter);
extensionRouter.use('/', extensionAnswersRouter);

export default extensionRouter;
