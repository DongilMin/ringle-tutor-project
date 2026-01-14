class CreatePayments < ActiveRecord::Migration[8.1]
  def change
    create_table :payments do |t|
      t.references :user, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :status, null: false, default: 'pending'
      t.string :payment_method, null: false
      t.string :transaction_id

      t.timestamps
    end

    add_index :payments, :status
    add_index :payments, :transaction_id, unique: true
  end
end
