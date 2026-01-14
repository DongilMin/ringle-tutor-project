class CreateMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :memberships do |t|
      t.references :user, null: false, foreign_key: true
      t.string :membership_type, null: false
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.string :status, null: false, default: 'active'

      t.timestamps
    end

    add_index :memberships, :status
    add_index :memberships, :end_date
  end
end
