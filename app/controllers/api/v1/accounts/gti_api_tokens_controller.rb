# GTI "Work": tokens for the Ticketz-compatible messages API, one or more per
# WhatsApp connection. Administrators only, since a token can send as the company.
class Api::V1::Accounts::GtiApiTokensController < Api::V1::Accounts::BaseController
  before_action :ensure_administrator
  before_action :fetch_api_token, only: [:update, :destroy, :regenerate]

  def index
    tokens = account_tokens.joins(:inbox).includes(:inbox).order(:created_at)
    render json: { payload: tokens.map(&:push_event_data) }
  end

  def create
    api_token = account_tokens.create!(api_token_params)
    render json: api_token.push_event_data
  end

  def update
    @api_token.update!(api_token_params.slice(:name))
    render json: @api_token.push_event_data
  end

  def regenerate
    @api_token.regenerate!
    render json: @api_token.push_event_data
  end

  def destroy
    @api_token.destroy!
    head :ok
  end

  private

  def account_tokens
    GtiApiToken.where(account: Current.account)
  end

  def fetch_api_token
    @api_token = account_tokens.find(params[:id])
  end

  def ensure_administrator
    raise Pundit::NotAuthorizedError unless Current.account_user&.administrator?
  end

  def api_token_params
    params.require(:gti_api_token).permit(:name, :inbox_id)
  end
end
