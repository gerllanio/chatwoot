import { mount, flushPromises } from '@vue/test-utils';
import ContactAPI from 'dashboard/api/contacts';
import MessageApi from 'dashboard/api/inbox/message';
import GtiContactHistory from '../GtiContactHistory.vue';

vi.mock('dashboard/api/contacts', () => ({
  default: { getConversations: vi.fn() },
}));
vi.mock('dashboard/api/inbox/message', () => ({
  default: { getPreviousMessages: vi.fn() },
}));

const current = {
  id: 30,
  created_at: 3000,
  meta: { sender: { id: 7 } },
};

const mountHistory = () =>
  mount(GtiContactHistory, { props: { conversation: current } });

describe('GtiContactHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ContactAPI.getConversations.mockResolvedValue({
      data: {
        payload: [
          { id: 30, created_at: 3000 },
          { id: 10, created_at: 1000 },
          { id: 20, created_at: 2000 },
          { id: 40, created_at: 4000 },
        ],
      },
    });
    MessageApi.getPreviousMessages.mockImplementation(({ conversationId }) =>
      Promise.resolve({
        data: {
          payload: [
            {
              id: conversationId * 100,
              content: `mensagem da conversa ${conversationId}`,
              message_type: 0,
              created_at: 1,
            },
          ],
        },
      })
    );
  });

  it('loads nothing until the agent asks for the history', () => {
    mountHistory();
    expect(ContactAPI.getConversations).not.toHaveBeenCalled();
  });

  it('shows only older conversations, oldest first, greyed out', async () => {
    const wrapper = mountHistory();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(ContactAPI.getConversations).toHaveBeenCalledWith(7);
    const requested = MessageApi.getPreviousMessages.mock.calls.map(
      ([args]) => args.conversationId
    );
    expect(requested.sort()).toEqual([10, 20]);

    const greyed = wrapper.findAll('.grayscale');
    expect(greyed.map(block => block.text())).toEqual([
      expect.stringContaining('mensagem da conversa 10'),
      expect.stringContaining('mensagem da conversa 20'),
    ]);
  });
});
