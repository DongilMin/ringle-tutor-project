namespace :memberships do
  desc "Expire memberships past their end_date"
  task expire_old: :environment do
    expired_count = Membership
      .where(status: "active")
      .where("end_date < ?", Date.current)
      .update_all(status: "expired")

    puts "Expired #{expired_count} membership(s)"
  end

  desc "Show statistics of membership statuses"
  task stats: :environment do
    puts "Membership Statistics:"
    puts "  Active: #{Membership.where(status: 'active').count}"
    puts "  Expired: #{Membership.where(status: 'expired').count}"
    puts "  Cancelled: #{Membership.where(status: 'cancelled').count}"
    puts "  Currently Valid: #{Membership.currently_valid.count}"
  end
end
