# GTI "Work" queue greeting of a team: color, greeting (with an optional image or audio)
# and out-of-hours message. Administrators only, like editing the team itself.
class Api::V1::Accounts::Teams::GtiSettingsController < Api::V1::Accounts::BaseController
  before_action :check_admin_authorization?
  before_action :fetch_setting

  def show
    render json: @setting.push_event_data
  end

  def update
    @setting.assign_attributes(setting_params.except(:greeting_media))
    @setting.greeting_media.attach(setting_params[:greeting_media]) if setting_params[:greeting_media].present?
    @setting.save!
    render json: @setting.push_event_data
  end

  def destroy_media
    @setting.greeting_media.purge if @setting.persisted?
    render json: @setting.push_event_data
  end

  private

  def fetch_setting
    team = Current.account.teams.find(params[:team_id])
    @setting = team.gti_setting || team.build_gti_setting
  end

  def setting_params
    params.require(:gti_setting).permit(:color, :greeting_message, :out_of_hours_message, :greeting_media)
  end
end
