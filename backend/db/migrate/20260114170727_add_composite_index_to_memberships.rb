class AddCompositeIndexToMemberships < ActiveRecord::Migration[8.1]
  def change
    # Add composite index for the most frequent query pattern
    add_index :memberships, [:user_id, :status, :end_date],
              name: 'idx_memberships_active_lookup',
              comment: 'Optimizes User#active_membership query'

    # Remove redundant single-column indexes (composite index covers them)
    remove_index :memberships, :status if index_exists?(:memberships, :status)
    remove_index :memberships, :end_date if index_exists?(:memberships, :end_date)
  end
end
