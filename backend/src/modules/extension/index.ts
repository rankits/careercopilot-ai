import { Router } from 'express';

import pairingRoutes from '@/modules/extension/routes/pairing.routes.js';
import autofillRoutes from '@/modules/extension/routes/autofill.routes.js';
import { extensionResumeRouter } from '@/modules/extension/routes/resume.routes.js';
import { extensionAnswersRouter } from '@/modules/extension/routes/answers.routes.js';

const extensionRouter = Router();

// Mount all extension-related routes here
extensionRouter.use('/', pairingRoutes);
extensionRouter.use('/', autofillRoutes);
extensionRouter.use('/', extensionResumeRouter);
extensionRouter.use('/', extensionAnswersRouter);

export default extensionRouter;
