class CreateGtiTeamSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :gti_team_settings do |t|
      t.references :account, null: false, index: false
      t.references :team, null: false, index: { unique: true }
      t.string :color
      t.text :greeting_message
      t.text :out_of_hours_message
      t.timestamps
    end
  end
end
