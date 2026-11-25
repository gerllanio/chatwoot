import {
  folderIcon,
  forwardDraft,
  replyDraft,
  sortFolders,
  totalUnread,
} from '../gtiMail';

describe('gtiMail helpers', () => {
  it('puts the special folders first, then the rest by name', () => {
    const folders = [
      { path: 'Projetos', name: 'Projetos' },
      { path: 'Lixeira', name: 'Lixeira', special_use: 'trash' },
      { path: 'INBOX', name: 'INBOX' },
      { path: 'Clientes', name: 'Clientes' },
      { path: 'Sent', name: 'Enviados', special_use: 'sent' },
    ];

    expect(sortFolders(folders).map(folder => folder.path)).toEqual([
      'INBOX',
      'Sent',
      'Lixeira',
      'Clientes',
      'Projetos',
    ]);
  });

  it('picks an icon by folder kind', () => {
    expect(folderIcon({ path: 'INBOX' })).toBe('i-lucide-inbox');
    expect(folderIcon({ path: 'X', special_use: 'sent' })).toBe(
      'i-lucide-send'
    );
    expect(folderIcon({ path: 'Clientes' })).toBe('i-lucide-folder');
  });

  it('builds a threaded reply with the original quoted', () => {
    const draft = replyDraft(
      {
        from_email: 'ana@cliente.com.br',
        subject: 'Orçamento',
        text: 'Linha 1\nLinha 2',
        message_id: 'abc@cliente.com.br',
        references: 'old@cliente.com.br',
      },
      'Ana escreveu:'
    );

    expect(draft).toMatchObject({
      to: 'ana@cliente.com.br',
      subject: 'Re: Orçamento',
      inReplyTo: 'abc@cliente.com.br',
      references: 'old@cliente.com.br',
    });
    expect(draft.body).toContain('> Linha 1\n> Linha 2');
  });

  it('does not stack prefixes on replies and forwards', () => {
    expect(replyDraft({ subject: 'Re: Oi' }, '').subject).toBe('Re: Oi');
    expect(forwardDraft({ subject: 'Fwd: Oi' }, '').subject).toBe('Fwd: Oi');
    expect(forwardDraft({ subject: 'Oi' }, '').to).toBe('');
  });

  it('adds up unread counts, ignoring unknown ones', () => {
    expect(totalUnread([{ unread: 2 }, { unread: null }, { unread: 3 }])).toBe(
      5
    );
  });
});
