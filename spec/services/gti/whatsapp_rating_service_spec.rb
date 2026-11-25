require 'rails_helper'

RSpec.describe Gti::WhatsappRatingService do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_whatsapp, account: account, provider: 'baileys', validate_provider_config: false, sync_templates: false) }
  let(:inbox) { channel.inbox }
  let(:agent) { create(:user, account: account) }
  let(:contact) { create(:contact, account: account) }
  let(:conversation) do
    create(:conversation, account: account, inbox: inbox, contact: contact, assignee: agent, status: :resolved)
  end

  before { inbox.update!(csat_survey_enabled: true) }

  def customer_says(content)
    create(:message, account: account, inbox: inbox, conversation: conversation, sender: contact,
                     message_type: :incoming, content: content)
  end

  describe 'on resolve' do
    it 'asks for a 1-5 rating in plain text instead of sending the survey link' do
      CsatSurveyService.new(conversation: conversation).perform

      expect(conversation.messages.where(content_type: :input_csat)).to be_empty
      request = conversation.messages.template.last
      expect(request.content).to eq(described_class::DEFAULT_REQUEST)
      expect(conversation.reload.additional_attributes).to include(
        'gti_rating_requested_at' => be_present, 'gti_rating_message_id' => request.id
      )
    end

    it 'uses the account text when one is configured' do
      account.update!(gti_rating_message: 'Nota de 1 a 5?')

      CsatSurveyService.new(conversation: conversation).perform

      expect(conversation.messages.template.last.content).to eq('Nota de 1 a 5?')
    end

    it 'keeps the survey link when the account chose it' do
      account.update!(gti_rating_mode: 'link')

      expect(described_class.applies_to?(conversation)).to be(false)
    end
  end

  describe 'the customer answer' do
    before { described_class.new(conversation: conversation).request }

    it 'stores a digit as the CSAT rating, thanks the customer and keeps the conversation resolved' do
      customer_says(' 4 ')

      response = conversation.reload.csat_survey_response
      expect(response.rating).to eq(4)
      expect(response.assigned_agent).to eq(agent)
      expect(conversation).to be_resolved
      expect(conversation.messages.template.last.content).to eq(described_class::DEFAULT_THANKS)
      expect(conversation.additional_attributes).not_to have_key('gti_rating_requested_at')
    end

    it 'reopens the conversation on any other answer' do
      customer_says('Ainda estou com problema')

      expect(conversation.reload).to be_open
      expect(CsatSurveyResponse.where(conversation: conversation)).to be_empty
      expect(conversation.additional_attributes).not_to have_key('gti_rating_requested_at')
    end

    it 'reopens the conversation when the digit arrives after the timeout' do
      account.update!(gti_rating_timeout_minutes: '20')

      travel 21.minutes do
        customer_says('5')
      end

      expect(conversation.reload).to be_open
      expect(CsatSurveyResponse.where(conversation: conversation)).to be_empty
    end
  end
end
