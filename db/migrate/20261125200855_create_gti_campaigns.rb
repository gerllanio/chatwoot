class CreateGtiCampaigns < ActiveRecord::Migration[7.2]
  def change
    create_contact_lists
    create_contact_list_items
    create_campaigns
    create_campaign_shippings
  end

  private

  def create_contact_lists
    create_table :gti_contact_lists do |t|
      t.references :account, null: false, index: true
      t.string :name, null: false
      t.integer :items_count, null: false, default: 0
      t.timestamps
    end
  end

  def create_contact_list_items
    create_table :gti_contact_list_items do |t|
      t.references :account, null: false, index: false
      t.references :gti_contact_list, null: false, index: false
      t.string :name
      t.string :number, null: false
      t.string :email
      t.timestamps
    end
    add_index :gti_contact_list_items, [:gti_contact_list_id, :number], unique: true
  end

  def create_campaigns
    create_table :gti_campaigns do |t|
      t.references :account, null: false, index: false
      t.references :inbox, null: false, index: false
      t.references :gti_contact_list, index: true
      t.references :created_by, index: false
      t.string :name, null: false
      t.jsonb :messages, null: false, default: []
      t.integer :status, null: false, default: 0
      t.datetime :scheduled_at
      t.datetime :completed_at
      t.integer :min_interval_seconds, null: false, default: 20
      t.integer :max_interval_seconds, null: false, default: 40
      t.timestamps
    end
    add_index :gti_campaigns, [:account_id, :status]
  end

  def create_campaign_shippings
    create_table :gti_campaign_shippings do |t|
      t.references :gti_campaign, null: false, index: false
      t.references :contact, index: false
      t.references :conversation, index: false
      t.string :name
      t.string :number, null: false
      t.text :message
      t.integer :status, null: false, default: 0
      t.string :error
      t.datetime :delivered_at
      t.timestamps
    end
    add_index :gti_campaign_shippings, [:gti_campaign_id, :status]
  end
end
