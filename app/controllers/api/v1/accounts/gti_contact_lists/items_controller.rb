# Recipients of a GTI contact list. Administrators only.
class Api::V1::Accounts::GtiContactLists::ItemsController < Api::V1::Accounts::BaseController
  include GtiAdministratorOnly

  PER_PAGE = 100

  before_action :fetch_list
  before_action :fetch_item, only: [:update, :destroy]

  def index
    items = @list.items.order(:name, :id)
    items = items.where(search_condition) if params[:q].present?
    page = [params[:page].to_i, 1].max
    render json: {
      payload: items.offset((page - 1) * PER_PAGE).limit(PER_PAGE).map(&:push_event_data),
      meta: { count: items.count, page: page, per_page: PER_PAGE }
    }
  end

  def create
    item = @list.items.create!(item_params.merge(account: Current.account))
    render json: item.push_event_data
  end

  def update
    @item.update!(item_params)
    render json: @item.push_event_data
  end

  def destroy
    @item.destroy!
    head :ok
  end

  private

  def fetch_list
    @list = GtiContactList.where(account: Current.account).find(params[:gti_contact_list_id])
  end

  def search_condition
    table = GtiContactListItem.arel_table
    pattern = "%#{GtiContactListItem.sanitize_sql_like(params[:q])}%"
    table[:name].matches(pattern).or(table[:number].matches(pattern))
  end

  def fetch_item
    @item = @list.items.find(params[:id])
  end

  def item_params
    params.require(:item).permit(:name, :number, :email)
  end
end
