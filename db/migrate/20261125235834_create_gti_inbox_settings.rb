class CreateGtiInboxSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :gti_inbox_settings do |t|
      t.references :account, null: false, index: false
      t.references :inbox, null: false, index: { unique: true }
      t.boolean :menu_enabled, null: false, default: false
      t.text :greeting_message
      t.integer :team_ids, array: true, null: false, default: []
      t.integer :no_queue_timeout_minutes
      t.bigint :no_queue_team_id
      t.timestamps
    end
  end
end
