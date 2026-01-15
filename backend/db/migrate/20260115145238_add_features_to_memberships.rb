class AddFeaturesToMemberships < ActiveRecord::Migration[8.1]
  def change
    add_column :memberships, :features, :json, default: []
  end
end
