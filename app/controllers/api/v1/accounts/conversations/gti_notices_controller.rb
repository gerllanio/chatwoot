# Sends the account's "ticket accepted" or "transfer" notice to the customer, right after
# the agent's Accept or Transfer action in the Work conversation header.
class Api::V1::Accounts::Conversations::GtiNoticesController < Api::V1::Accounts::Conversations::BaseController
  def create
    kind = params.require(:kind)
    unless Gti::ConversationNoticeService::KINDS.key?(kind)
      return render json: { error: I18n.t('errors.gti_notices.invalid_kind') }, status: :unprocessable_entity
    end

    message = Gti::ConversationNoticeService.new(conversation: @conversation, user: Current.user, kind: kind).perform
    head(message ? :created : :no_content)
  end
end
