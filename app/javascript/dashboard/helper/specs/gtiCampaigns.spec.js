import {
  buildCampaignFormData,
  campaignProgress,
  campaignToForm,
  emptyCampaignForm,
  isCampaignEditable,
} from '../gtiCampaigns';

describe('buildCampaignFormData', () => {
  it('sends only the filled message variations, trimmed', () => {
    const form = {
      ...emptyCampaignForm(),
      name: ' Aniversariantes ',
      inboxId: 5,
      contactListId: 2,
      messages: [' Oi {nome} ', '', 'Olá {nome}', '  ', ''],
    };

    const data = buildCampaignFormData(form);

    expect(data.get('gti_campaign[name]')).toBe('Aniversariantes');
    expect(data.getAll('gti_campaign[messages][]')).toEqual([
      'Oi {nome}',
      'Olá {nome}',
    ]);
    expect(data.get('gti_campaign[scheduled_at]')).toBe('');
    expect(data.has('remove_media')).toBe(false);
  });

  it('sends the schedule as an ISO timestamp', () => {
    const form = { ...emptyCampaignForm(), scheduledAt: '2026-12-01T09:30' };

    const sent = buildCampaignFormData(form).get('gti_campaign[scheduled_at]');

    expect(new Date(sent).getTime()).toBe(
      new Date('2026-12-01T09:30').getTime()
    );
  });
});

describe('campaignToForm', () => {
  it('fills all five message slots and the ids', () => {
    const form = campaignToForm({
      name: 'Black Friday',
      inbox: { id: 5 },
      contact_list: { id: 2 },
      messages: ['Oi'],
      scheduled_at: null,
      min_interval_seconds: 30,
      max_interval_seconds: 60,
    });

    expect(form.messages).toEqual(['Oi', '', '', '', '']);
    expect(form).toMatchObject({
      inboxId: 5,
      contactListId: 2,
      minInterval: 30,
    });
  });
});

describe('campaign state helpers', () => {
  it('lets only campaigns that did not start be edited', () => {
    expect(isCampaignEditable({ status: 'scheduled' })).toBe(true);
    expect(isCampaignEditable({ status: 'in_progress' })).toBe(false);
  });

  it('counts failed sends as processed in the progress', () => {
    const progress = campaignProgress({
      shippings: { total: 4, delivered: 2, failed: 1, pending: 1 },
    });

    expect(progress).toBe(75);
  });
});
