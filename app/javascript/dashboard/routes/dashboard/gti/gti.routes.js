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
import GtiUsers from './GtiUsers.vue';
import GtiQueues from './GtiQueues.vue';
import GtiConnections from './GtiConnections.vue';
import GtiQuickReplies from './GtiQuickReplies.vue';
import GtiTags from './GtiTags.vue';
import GtiContacts from './GtiContacts.vue';
import GtiIntegrations from './GtiIntegrations.vue';
import {
  ROLES,
  CONVERSATION_PERMISSIONS,
} from 'dashboard/constants/permissions.js';

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
    {
      path: frontendURL('accounts/:accountId/gti/users'),
      name: 'gti_users',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiUsers,
    },
    {
      path: frontendURL('accounts/:accountId/gti/queues'),
      name: 'gti_queues',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiQueues,
    },
    {
      path: frontendURL('accounts/:accountId/gti/connections'),
      name: 'gti_connections',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiConnections,
    },
    {
      path: frontendURL('accounts/:accountId/gti/quick-replies'),
      name: 'gti_quick_replies',
      meta: {
        permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
      },
      component: GtiQuickReplies,
    },
    {
      path: frontendURL('accounts/:accountId/gti/tags'),
      name: 'gti_tags',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiTags,
    },
    {
      path: frontendURL('accounts/:accountId/gti/contacts'),
      name: 'gti_contacts',
      meta: {
        permissions: ['administrator', 'agent', 'contact_manage'],
      },
      component: GtiContacts,
    },
    {
      path: frontendURL('accounts/:accountId/gti/integrations'),
      name: 'gti_integrations',
      meta: {
        permissions: ['administrator'],
      },
      component: GtiIntegrations,
    },
  ],
};
