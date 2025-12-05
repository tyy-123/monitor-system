import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      // 配置代理
      proxy: {
        '/api': {
          target: env.VUE_APP_BASE_API, // 后端API地址
          changeOrigin: true, // 允许跨域
          secure: false, // 如果是https接口，需要配置这个参数
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.log('代理错误:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('代理请求:', req.method, req.url, '->', proxyReq.path);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('代理响应:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    // 构建配置
    build: {
      outDir: 'dist', // 打包输出目录
      sourcemap: false, // 是否生成sourcemap
      chunkSizeWarningLimit: 1600, //  chunk 大小警告的限制
      // 配置rollup选项
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      }
    }
  }
})