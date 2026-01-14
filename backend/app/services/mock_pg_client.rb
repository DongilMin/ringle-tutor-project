class MockPgClient
  # 테스트/개발용 Mock Payment Gateway
  # 실제 PG 연동 시 이 클래스를 실제 PG SDK로 교체

  FAILURE_RATE = 0.1 # 10% 실패율 시뮬레이션 (테스트용)

  def initialize(force_success: nil, force_failure: nil)
    @force_success = force_success
    @force_failure = force_failure
  end

  def charge(amount:, payment_method:, order_id:)
    # 시뮬레이션 지연 (실제 PG 응답 시간)
    simulate_latency

    if should_fail?
      failure_response
    else
      success_response(order_id)
    end
  end

  private

  def simulate_latency
    # 개발 환경에서는 빠르게, 테스트 시 지연 시뮬레이션 가능
    sleep(0.1) if Rails.env.development?
  end

  def should_fail?
    return true if @force_failure
    return false if @force_success

    # 랜덤 실패 시뮬레이션 (테스트 환경에서는 비활성화)
    return false if Rails.env.test?

    rand < FAILURE_RATE
  end

  def success_response(order_id)
    {
      success: true,
      transaction_id: generate_transaction_id(order_id),
      message: "Payment processed successfully"
    }
  end

  def failure_response
    {
      success: false,
      transaction_id: nil,
      error: "Payment declined by issuer"
    }
  end

  def generate_transaction_id(order_id)
    "TXN_#{order_id}_#{SecureRandom.hex(8).upcase}"
  end
end
