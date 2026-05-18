import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';

console.log('Starting Vue app with Element Plus...');

const app = createApp(App);
app.use(ElementPlus);

app.mount('#app');

console.log('Vue app mounted successfully!');
