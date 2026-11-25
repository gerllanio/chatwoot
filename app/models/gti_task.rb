# GTI "Work" team task: a to-do for an agent, optionally linked to a conversation.
#
# == Schema Information
#
# Table name: gti_tasks
#
#  id              :bigint           not null, primary key
#  completed_at    :datetime
#  description     :text
#  due_at          :datetime
#  priority        :integer          default("medium"), not null
#  title           :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint           not null
#  assignee_id     :bigint
#  conversation_id :bigint
#  created_by_id   :bigint
#
# Indexes
#
#  index_gti_tasks_on_account_id_and_assignee_id              (account_id,assignee_id)
#  index_gti_tasks_on_account_id_and_completed_at_and_due_at  (account_id,completed_at,due_at)
#  index_gti_tasks_on_conversation_id                         (conversation_id)
#
class GtiTask < ApplicationRecord
  belongs_to :account
  belongs_to :assignee, class_name: 'User', optional: true
  belongs_to :created_by, class_name: 'User', optional: true
  belongs_to :conversation, optional: true

  enum :priority, { low: 0, medium: 1, high: 2 }, validate: true

  validates :title, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 5000 }
  validate :assignee_is_account_member
  validate :conversation_is_from_account

  scope :pending, -> { where(completed_at: nil) }
  scope :completed, -> { where.not(completed_at: nil) }
  scope :in_work_order, -> { order(arel_table[:due_at].asc.nulls_last, arel_table[:created_at].desc) }

  def completed?
    completed_at.present?
  end

  def push_event_data
    {
      id: id,
      title: title,
      description: description,
      priority: priority,
      due_at: due_at&.to_i,
      completed_at: completed_at&.to_i,
      created_at: created_at.to_i,
      assignee: assignee && { id: assignee.id, name: assignee.available_name, thumbnail: assignee.avatar_url },
      created_by: created_by && { id: created_by.id, name: created_by.available_name },
      conversation_display_id: conversation&.display_id
    }
  end

  private

  def assignee_is_account_member
    return if assignee_id.blank? || account&.users&.exists?(assignee_id)

    errors.add(:assignee, 'must be a member of the account')
  end

  def conversation_is_from_account
    return if conversation.blank? || conversation.account_id == account_id

    errors.add(:conversation, 'must belong to the account')
  end
end
