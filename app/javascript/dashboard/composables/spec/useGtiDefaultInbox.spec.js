import { pickDefaultInbox } from '../useGtiDefaultInbox';

describe('pickDefaultInbox', () => {
  const inboxes = [{ id: 5 }, { id: 6 }];

  it('picks the remembered inbox when the contact can use it', () => {
    expect(pickDefaultInbox(inboxes, 6)).toEqual({ id: 6 });
  });

  it('picks nothing when the remembered inbox is not available', () => {
    expect(pickDefaultInbox(inboxes, 9)).toBeNull();
    expect(pickDefaultInbox(undefined, 5)).toBeNull();
  });
});
