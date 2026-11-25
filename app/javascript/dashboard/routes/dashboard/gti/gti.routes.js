import { frontendURL } from '../../../helper/URLHelper';
import GtiKanban from './GtiKanban.vue';
import GtiHelp from './GtiHelp.vue';
import GtiTasks from './GtiTasks.vue';
import GtiMail from './GtiMail.vue';
import GtiPanel from './GtiPanel.vue';
import GtiMessagesApi from './GtiMessagesApi.vue';
import GtiSettings from './GtiSettings.vue';
import GtiCampaigns from './GtiCampaigns.vue';
import GtiContactLists from './GtiContactLists.vue';
import GtiContactListItems from './GtiContactListItems.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/gti/kanban'),
      name: 'gti_kanban',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiKanban,
    },
    {
      // The old TV monitor link: the same Kanban, opened in TV mode.
      path: frontendURL('accounts/:accountId/gti/monitor'),
      name: 'gti_monitor',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiKanban,
      props: { tv: true },
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
    {
      path: frontendURL('accounts/:accountId/gti/mail'),
      name: 'gti_mail',
      meta: {
        permissions: ['administrator', 'agent'],
      },
      component: GtiMail,
    },
    {
      path: frontendURL('accounts/:accountId/gti/panel'),
      name: 'gti_panel',
      meta: {
        permissions: ['administrator', 'report_manage'],
      },
      component: GtiPanel,
    },
    {
      path: frontendURL('accounts/:accountId/gti/messages-api'),
      name: 'gti_messages_api',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiMessagesApi,
    },
    {
      path: frontendURL('accounts/:accountId/gti/settings'),
      name: 'gti_settings',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiSettings,
    },
    {
      path: frontendURL('accounts/:accountId/gti/campaigns'),
      name: 'gti_campaigns',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiCampaigns,
    },
    {
      path: frontendURL('accounts/:accountId/gti/contact-lists'),
      name: 'gti_contact_lists',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiContactLists,
    },
    {
      path: frontendURL('accounts/:accountId/gti/contact-lists/:listId'),
      name: 'gti_contact_list_items',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiContactListItems,
    },
  ],
};
