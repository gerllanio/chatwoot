# GTI "Work" connection greeting and queue menu of a WhatsApp inbox (see GtiInboxSetting).
# Administrators only, like editing the inbox itself.
class Api::V1::Accounts::Inboxes::GtiSettingsController < Api::V1::Accounts::BaseController
  before_action :check_admin_authorization?
  before_action :fetch_setting

  def show
    render json: @setting.push_event_data
  end

  def update
    @setting.update!(setting_params)
    render json: @setting.push_event_data
  end

  private

  def fetch_setting
    inbox = Current.account.inboxes.find(params[:inbox_id])
    @setting = inbox.gti_setting || inbox.build_gti_setting
  end

  def setting_params
    params.require(:gti_setting).permit(:menu_enabled, :greeting_message, :no_queue_timeout_minutes, :no_queue_team_id, team_ids: [])
  end
end
