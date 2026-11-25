import { frontendURL } from '../../../helper/URLHelper';
import GtiMonitor from './GtiMonitor.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/gti/monitor'),
      name: 'gti_monitor',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiMonitor,
    },
  ],
};
