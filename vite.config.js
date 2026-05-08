var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var apiTarget = (_a = process.env.VITE_API_TARGET) !== null && _a !== void 0 ? _a : 'http://127.0.0.1:3333';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
            },
            '/health': {
                target: apiTarget,
                changeOrigin: true,
            },
        },
    },
});
