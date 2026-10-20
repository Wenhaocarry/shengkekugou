import { installBrowserDemo } from './browser-demo.js';

try {
  await installBrowserDemo();
  await import('./kugou.js');
} catch (error) {
  const message = document.createElement('p');
  message.className = 'empty';
  message.textContent = '无法打开浏览器保存空间。请允许本站使用本地存储后刷新；已有数据不会被自动清空。' + (error.message || '');
  document.querySelector('#app').replaceChildren(message);
}
