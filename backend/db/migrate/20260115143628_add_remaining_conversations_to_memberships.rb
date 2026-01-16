class AddRemainingConversationsToMemberships < ActiveRecord::Migration[8.1]
  def change
    add_column :memberships, :remaining_conversations, :integer, default: nil
    add_column :memberships, :is_usage_based, :boolean, default: false, null: false
  end
end
