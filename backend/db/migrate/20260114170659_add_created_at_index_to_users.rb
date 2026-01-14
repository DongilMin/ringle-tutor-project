class AddCreatedAtIndexToUsers < ActiveRecord::Migration[8.1]
  def change
    add_index :users, :created_at, comment: 'Optimizes time-based queries for user listings'
  end
end
