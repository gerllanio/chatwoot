import { GTI_CHAT_ACTIONS, gtiChatActions } from '../gtiChat';

const { ACCEPT, RETURN, RESOLVE, REOPEN, TRANSFER } = GTI_CHAT_ACTIONS;

describe('gtiChatActions', () => {
  it('lets anyone accept a waiting conversation', () => {
    const chat = { status: 'open', meta: { assignee: null } };

    expect(gtiChatActions(chat)).toEqual([ACCEPT, RESOLVE, TRANSFER]);
  });

  it('offers return, resolve and transfer while someone attends it', () => {
    const chat = { status: 'open', meta: { assignee: { id: 3 } } };

    expect(gtiChatActions(chat)).toEqual([RETURN, RESOLVE, TRANSFER]);
  });

  it('only reopens a resolved conversation', () => {
    const chat = { status: 'resolved', meta: { assignee: { id: 3 } } };

    expect(gtiChatActions(chat)).toEqual([REOPEN]);
  });

  it('reopens a pending or snoozed conversation and still allows transfer', () => {
    expect(gtiChatActions({ status: 'snoozed', meta: {} })).toEqual([
      REOPEN,
      TRANSFER,
    ]);
  });
});
