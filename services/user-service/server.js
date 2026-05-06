// server.js
import app from './src/app.js';
import { config } from './src/config/env.js';

app.listen(config.PORT, () => {
    console.log(`User Service (Trust Engine) running in ${config.NODE_ENV} mode on port ${config.PORT}`);
});
