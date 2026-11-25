class CreateGtiApiTokens < ActiveRecord::Migration[7.2]
  def change
    create_table :gti_api_tokens do |t|
      t.references :account, null: false, index: false
      t.references :inbox, null: false, index: true
      t.string :name, null: false
      t.string :token, null: false
      t.datetime :last_used_at
      t.timestamps
    end

    add_index :gti_api_tokens, :token, unique: true
    add_index :gti_api_tokens, [:account_id, :inbox_id]
  end
end
