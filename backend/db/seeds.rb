# Create 5 demo users for development/testing
demo_users = [
  { id: 1, email: "user1@example.com", name: "김철수" },
  { id: 2, email: "user2@example.com", name: "이영희" },
  { id: 3, email: "user3@example.com", name: "박민수" },
  { id: 4, email: "user4@example.com", name: "정수진" },
  { id: 5, email: "user5@example.com", name: "최동훈" }
]

demo_users.each do |user_data|
  User.find_or_create_by!(email: user_data[:email]) do |u|
    u.name = user_data[:name]
  end
end

puts "Seeded #{demo_users.size} demo users"

# Optionally create some sample memberships for testing
if ENV["SEED_MEMBERSHIPS"] == "true"
  # Give user 1 a premium membership
  user1 = User.find_by(email: "user1@example.com")
  if user1 && user1.memberships.active.empty?
    user1.memberships.create!(
      membership_type: "premium",
      start_date: Date.current,
      end_date: Date.current + 60.days,
      status: "active",
      features: %w[learning conversation analysis]
    )
    puts "Created premium membership for user1"
  end
end
