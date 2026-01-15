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
    # Payment와 연결된 Membership 찾기 (FK 기반)
    return nil unless object.membership

    MembershipSerializer.new(object.membership).as_json
  end
end
