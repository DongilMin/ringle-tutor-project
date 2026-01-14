class PaymentSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      amount: format_currency(object.amount),
      status: object.status,
      payment_method: object.payment_method,
      transaction_id: object.transaction_id,
      created_at: format_datetime(object.created_at),
      updated_at: format_datetime(object.updated_at)
    }
  end

  def as_json_with_membership
    as_json.merge(
      membership: serialize_membership
    )
  end

  private

  def serialize_membership
    # Payment와 연결된 Membership 찾기 (같은 user, 같은 시점에 생성된)
    membership = object.user.memberships
      .where("created_at >= ?", object.created_at - 1.second)
      .where("created_at <= ?", object.created_at + 1.second)
      .first

    return nil unless membership

    MembershipSerializer.new(membership).as_json
  end
end
