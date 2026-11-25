# GTI "Work" team tasks. Any member of the account can list, create and update tasks.
class Api::V1::Accounts::GtiTasksController < Api::V1::Accounts::BaseController
  MAX_TASKS = 200
  STATUSES = %w[pending completed].freeze

  before_action :validate_index_params, only: :index
  before_action :fetch_task, only: [:update, :destroy]

  def index
    tasks = account_tasks.includes(:assignee, :created_by, :conversation)
    tasks = params[:status] == 'completed' ? tasks.completed : tasks.pending
    tasks = tasks.where(assignee_id: Current.user.id) if params[:assignee] == 'me'
    render json: { payload: tasks.in_work_order.limit(MAX_TASKS).map(&:push_event_data) }
  end

  def create
    task = account_tasks.new(task_attributes.merge(created_by: Current.user))
    task.save!
    render json: task.push_event_data
  end

  def update
    @task.update!(task_attributes)
    render json: @task.push_event_data
  end

  def destroy
    @task.destroy!
    head :ok
  end

  private

  def account_tasks
    GtiTask.where(account: Current.account)
  end

  def fetch_task
    @task = account_tasks.find(params[:id])
  end

  def validate_index_params
    return if params[:status].blank? || STATUSES.include?(params[:status])

    render json: { error: "status must be one of #{STATUSES.join(', ')}" }, status: :unprocessable_entity
  end

  def task_params
    params.require(:gti_task).permit(:title, :description, :assignee_id, :priority, :due_at, :completed, :conversation_display_id)
  end

  def task_attributes
    attributes = task_params.except(:completed, :conversation_display_id)
    attributes[:completed_at] = completion_time if task_params.key?(:completed)
    attributes[:conversation] = linked_conversation if task_params.key?(:conversation_display_id)
    attributes
  end

  def completion_time
    ActiveModel::Type::Boolean.new.cast(task_params[:completed]) ? Time.current : nil
  end

  def linked_conversation
    display_id = task_params[:conversation_display_id]
    return if display_id.blank?

    Current.account.conversations.find_by!(display_id: display_id)
  end
end
