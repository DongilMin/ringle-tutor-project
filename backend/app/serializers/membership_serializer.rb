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
      is_usage_based: object.is_usage_based?,
      remaining_conversations: object.remaining_conversations,
      can_use_conversation: object.can_use_conversation?,
      features: object.available_features,
      can_learn: object.can_learn?,
      can_analyze: object.can_analyze?,
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
