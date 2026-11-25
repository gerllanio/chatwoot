# Ticketz-compatible messages API. n8n and Primata call
#   POST /backend/api/messages/send   (Ticketz's path, kept so only the host changes)
#   POST /api/messages/send
# with `Authorization: Bearer <token>` and either JSON { number, body, saveOnTicket }
# or multipart with `medias` files. The token, managed in Integrations > API de
# mensagens, picks the WhatsApp connection that sends.
class Gti::MessagesApiController < ActionController::API
  before_action :authenticate_token
  before_action :validate_content

  def create
    Gti::MessagesApiSendService.new(
      api_token: @api_token, number: params[:number], body: params[:body],
      medias: params[:medias], save_on_ticket: params[:saveOnTicket]
    ).perform
    render json: { mensagem: 'Mensagem enviada' }
  rescue Gti::MessagesApiSendService::InvalidNumber
    render json: { error: 'ERR_INVALID_NUMBER', message: 'Número inválido' }, status: :unprocessable_entity
  end

  private

  def authenticate_token
    token = request.authorization.to_s.delete_prefix('Bearer ').strip
    @api_token = GtiApiToken.includes(:inbox).find_by(token: token) if token.present?
    return render_unauthorized if @api_token&.inbox.nil?

    @api_token.touch_last_used!
  end

  def render_unauthorized
    render json: { error: 'ERR_SESSION_EXPIRED', message: 'Token inválido' }, status: :unauthorized
  end

  def validate_content
    return render_invalid('number') if params[:number].blank?
    return if params[:body].present? || params[:medias].present?

    render_invalid('body')
  end

  def render_invalid(field)
    render json: { error: 'ERR_INVALID_PARAMS', message: "#{field} é obrigatório" }, status: :unprocessable_entity
  end
end
