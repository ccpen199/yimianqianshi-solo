import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('@/views/CustomersView.vue')
    },
    {
      path: '/customers/:id',
      name: 'customer-detail',
      component: () => import('@/views/CustomerDetailView.vue')
    },
    {
      path: '/renewal-calendar',
      name: 'renewal-calendar',
      component: () => import('@/views/RenewalCalendarView.vue')
    },
    {
      path: '/risk-alerts',
      name: 'risk-alerts',
      component: () => import('@/views/RiskAlertsView.vue')
    },
    {
      path: '/renewal-records',
      name: 'renewal-records',
      component: () => import('@/views/RenewalRecordsView.vue')
    },
    {
      path: '/high-risk',
      name: 'high-risk',
      component: () => import('@/views/HighRiskCustomersView.vue')
    },
    {
      path: '/churned',
      name: 'churned',
      component: () => import('@/views/ChurnedCustomersView.vue')
    },
    {
      path: '/upsell',
      name: 'upsell',
      component: () => import('@/views/UpsellOpportunitiesView.vue')
    }
  ]
})

export default router
