class AddMembershipIdToPayments < ActiveRecord::Migration[8.1]
  def change
    add_reference :payments, :membership, null: true, foreign_key: true
  end
end
