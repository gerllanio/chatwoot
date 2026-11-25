class CreateGtiTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :gti_tasks do |t|
      t.references :account, null: false, index: false
      t.string :title, null: false
      t.text :description
      t.references :assignee, index: false
      t.references :created_by, index: false
      t.references :conversation, index: true
      t.integer :priority, null: false, default: 1
      t.datetime :due_at
      t.datetime :completed_at
      t.timestamps
    end

    add_index :gti_tasks, [:account_id, :completed_at, :due_at]
    add_index :gti_tasks, [:account_id, :assignee_id]
  end
end
