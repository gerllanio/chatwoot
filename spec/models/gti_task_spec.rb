require 'rails_helper'

RSpec.describe GtiTask do
  let(:account) { create(:account) }

  it 'requires a title' do
    task = build(:gti_task, account: account, title: '')

    expect(task).not_to be_valid
    expect(task.errors[:title]).to be_present
  end

  it 'rejects an assignee who is not a member of the account' do
    outsider = create(:user)
    task = build(:gti_task, account: account, assignee: outsider)

    expect(task).not_to be_valid
    expect(task.errors[:assignee]).to be_present
  end

  it 'rejects a conversation from another account' do
    task = build(:gti_task, account: account, conversation: create(:conversation))

    expect(task).not_to be_valid
    expect(task.errors[:conversation]).to be_present
  end

  it 'reports an unknown priority as a validation error' do
    task = build(:gti_task, account: account, priority: 'urgent')

    expect(task).not_to be_valid
    expect(task.errors[:priority]).to be_present
  end

  it 'lists pending tasks with the nearest due date first and undated ones last' do
    later = create(:gti_task, account: account, due_at: 2.days.from_now)
    undated = create(:gti_task, account: account, due_at: nil)
    sooner = create(:gti_task, account: account, due_at: 1.hour.from_now)
    create(:gti_task, account: account, completed_at: Time.current)

    expect(described_class.pending.in_work_order).to eq([sooner, later, undated])
  end
end
