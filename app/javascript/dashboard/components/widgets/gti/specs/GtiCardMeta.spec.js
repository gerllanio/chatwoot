import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import GtiCardMeta from '../GtiCardMeta.vue';

const buildStore = teams =>
  createStore({
    modules: {
      teams: {
        namespaced: true,
        getters: { getTeams: () => teams },
      },
    },
  });

const mountMeta = (props, teams = []) =>
  mount(GtiCardMeta, {
    props,
    global: { plugins: [buildStore(teams)] },
  });

const chip = (wrapper, name) =>
  wrapper.find(`[data-test-id="gti-chip-${name}"]`);
const stripe = wrapper => wrapper.find('[data-test-id="gti-card-stripe"]');

describe('GtiCardMeta', () => {
  it('names the queue, the connection and the assignee', () => {
    const wrapper = mountMeta({
      chat: { id: 1, meta: { team: { id: 4, name: 'Suporte' } } },
      inbox: { id: 2, name: 'WhatsApp GTI' },
      assignee: { id: 3, name: 'Ana' },
    });

    expect(chip(wrapper, 'team').text()).toBe('Suporte');
    expect(chip(wrapper, 'inbox').text()).toBe('WhatsApp GTI');
    expect(chip(wrapper, 'assignee').text()).toBe('Ana');
  });

  it('leaves out the chips the conversation has nothing for', () => {
    const wrapper = mountMeta({ chat: { id: 1, meta: {} } });

    expect(chip(wrapper, 'team').exists()).toBe(false);
    expect(chip(wrapper, 'inbox').exists()).toBe(false);
    expect(chip(wrapper, 'assignee').exists()).toBe(false);
  });

  it('paints the stripe with the brand colour when there is no team colour', () => {
    const wrapper = mountMeta({
      chat: {
        id: 1,
        meta: { team: { id: 4, name: 'Suporte', icon_color: '' } },
      },
    });

    expect(stripe(wrapper).classes()).toContain('bg-n-brand');
    expect(stripe(wrapper).attributes('style')).toBeUndefined();
  });

  it('prefers the team as the store has it over the embedded copy', () => {
    const wrapper = mountMeta(
      {
        chat: {
          id: 1,
          meta: { team: { id: 4, name: 'Suporte', icon_color: '#000000' } },
        },
      },
      [{ id: 4, name: 'Suporte N2', icon_color: '#ff0000' }]
    );

    expect(chip(wrapper, 'team').text()).toBe('Suporte N2');
    expect(stripe(wrapper).classes()).not.toContain('bg-n-brand');
    expect(stripe(wrapper).attributes('style')).toContain(
      'background-color: rgb(255, 0, 0)'
    );
  });
});
