# GTI "Work" campaigns: bulk WhatsApp sends to a contact list through a native WhatsApp
# inbox. Administrators only. A campaign can be edited until it starts; after that it can
# only be cancelled, restarted (resumes the pending sends) or deleted.
class Api::V1::Accounts::GtiCampaignsController < Api::V1::Accounts::BaseController
  include GtiAdministratorOnly

  REPORT_PER_PAGE = 100

  before_action :fetch_campaign, except: [:index, :create]

  def index
    campaigns = account_campaigns.includes(:inbox, :contact_list, media_attachment: :blob).latest_first
    render json: { payload: campaigns.map(&:push_event_data) }
  end

  def show
    render json: @campaign.push_event_data
  end

  def create
    campaign = account_campaigns.new(campaign_params.merge(created_by: Current.user))
    campaign.save!
    campaign.apply_schedule!
    render json: campaign.push_event_data
  end

  def update
    return render_not_editable unless @campaign.editable?

    @campaign.media.purge if ActiveModel::Type::Boolean.new.cast(params[:remove_media])
    @campaign.update!(campaign_params)
    @campaign.apply_schedule!
    render json: @campaign.push_event_data
  end

  def destroy
    @campaign.destroy!
    head :ok
  end

  def cancel
    @campaign.with_lock do
      @campaign.cancelled! if @campaign.scheduled? || @campaign.in_progress?
    end
    render json: @campaign.push_event_data
  end

  def restart
    return render_not_restartable unless @campaign.cancelled?

    if @campaign.shippings.exists?
      @campaign.in_progress!
      @campaign.enqueue_pending_shippings!
      @campaign.finish_if_done!
    else
      @campaign.update!(status: :inactive, scheduled_at: [@campaign.scheduled_at, Time.current].compact.max)
      @campaign.apply_schedule!
    end
    render json: @campaign.reload.push_event_data
  end

  def report
    shippings = @campaign.shippings.includes(:conversation).order(:id)
    shippings = shippings.where(status: params[:status]) if GtiCampaignShipping.statuses.key?(params[:status])
    page = [params[:page].to_i, 1].max
    render json: {
      campaign: @campaign.push_event_data,
      payload: shippings.offset((page - 1) * REPORT_PER_PAGE).limit(REPORT_PER_PAGE).map(&:push_event_data),
      meta: { count: shippings.count, page: page, per_page: REPORT_PER_PAGE }
    }
  end

  private

  def account_campaigns
    GtiCampaign.where(account: Current.account)
  end

  def fetch_campaign
    @campaign = account_campaigns.find(params[:id])
  end

  def campaign_params
    params.require(:gti_campaign).permit(:name, :inbox_id, :gti_contact_list_id, :scheduled_at, :min_interval_seconds,
                                         :max_interval_seconds, :media, messages: [])
  end

  def render_not_editable
    render json: { error: 'The campaign has already started' }, status: :unprocessable_entity
  end

  def render_not_restartable
    render json: { error: 'Only a cancelled campaign can be restarted' }, status: :unprocessable_entity
  end
end
