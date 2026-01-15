# Create a default user for development/testing
User.find_or_create_by!(email: "user@example.com") do |u|
  u.name = "Test User"
end

puts "Seeded default user: user@example.com"