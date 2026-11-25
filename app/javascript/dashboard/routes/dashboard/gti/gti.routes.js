import { frontendURL } from '../../../helper/URLHelper';
import GtiMonitor from './GtiMonitor.vue';
import GtiHelp from './GtiHelp.vue';
import GtiTasks from './GtiTasks.vue';

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
    {
      path: frontendURL('accounts/:accountId/gti/help'),
      name: 'gti_help',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiHelp,
    },
    {
      path: frontendURL('accounts/:accountId/gti/tasks'),
      name: 'gti_tasks',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiTasks,
    },
  ],
};
