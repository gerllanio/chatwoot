# GTI "Work" contact lists, the audiences of GTI campaigns. Administrators only.
class Api::V1::Accounts::GtiContactListsController < Api::V1::Accounts::BaseController
  include GtiAdministratorOnly

  MAX_IMPORT_ROWS = 10_000

  before_action :fetch_list, except: [:index, :create]

  def index
    lists = GtiContactList.where(account: Current.account).order(:name)
    render json: { payload: lists.map(&:push_event_data) }
  end

  def show
    render json: @list.push_event_data
  end

  def create
    list = GtiContactList.create!(list_params.merge(account: Current.account))
    render json: list.push_event_data
  end

  def update
    @list.update!(list_params)
    render json: @list.push_event_data
  end

  def destroy
    @list.destroy!
    head :ok
  end

  # CSV with a header row: name, number and email (number required). Rows already in the
  # list, or without a usable number, are skipped and counted.
  def import
    file = params.require(:file)
    result = Gti::ContactListImportService.new(list: @list, csv: file.read, max_rows: MAX_IMPORT_ROWS).perform
    render json: result.merge(list: @list.reload.push_event_data)
  end

  private

  def fetch_list
    @list = GtiContactList.where(account: Current.account).find(params[:id])
  end

  def list_params
    params.require(:gti_contact_list).permit(:name)
  end
end
