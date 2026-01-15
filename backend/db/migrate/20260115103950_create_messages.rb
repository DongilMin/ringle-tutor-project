class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.string :role, null: false
      t.text :content
      t.binary :audio_data
      t.string :audio_content_type
      t.float :audio_duration

      t.timestamps
    end

    add_index :messages, [ :conversation_id, :created_at ]
  end
end
