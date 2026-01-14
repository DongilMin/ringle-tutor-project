class MembershipSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      membership_type: object.membership_type,
      status: object.status,
      start_date: format_date(object.start_date),
      end_date: format_date(object.end_date),
      is_active: object.active?,
      days_remaining: object.days_remaining,
      created_at: format_datetime(object.created_at),
      updated_at: format_datetime(object.updated_at)
    }
  end

  def as_json_with_user
    as_json.merge(
      user: UserSerializer.new(object.user).as_json
    )
  end
end
