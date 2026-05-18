import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/Test.vue'),
    meta: { title: '测试页面' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据概览' },
      },
      {
        path: 'evaluation-sets',
        name: 'EvaluationSets',
        component: () => import('@/views/evaluation-sets/Index.vue'),
        meta: { title: '评测集管理' },
      },
      {
        path: 'evaluation-sets/:id',
        name: 'EvaluationSetDetail',
        component: () => import('@/views/evaluation-sets/Detail.vue'),
        meta: { title: '评测集详情' },
      },
      {
        path: 'model-tasks',
        name: 'ModelTasks',
        component: () => import('@/views/model-tasks/Index.vue'),
        meta: { title: '模型任务' },
      },
      {
        path: 'model-tasks/:id',
        name: 'ModelTaskDetail',
        component: () => import('@/views/model-tasks/Detail.vue'),
        meta: { title: '任务详情' },
      },
      {
        path: 'scoring',
        name: 'Scoring',
        component: () => import('@/views/scoring/Index.vue'),
        meta: { title: '评分复核' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/Index.vue'),
        meta: { title: '评测报告' },
      },
      {
        path: 'reports/:id',
        name: 'ReportDetail',
        component: () => import('@/views/reports/Detail.vue'),
        meta: { title: '报告详情' },
      },
      {
        path: 'cost',
        name: 'Cost',
        component: () => import('@/views/cost/Index.vue'),
        meta: { title: '成本统计' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'AI 模型评测平台'}`;
  next();
});

export default router;
