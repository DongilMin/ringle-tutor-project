module Api
  module V1
    class PaymentsController < BaseController
      def create
        puts "PaymentsController#create called with params: #{payment_params.inspect}"
        puts "Current User: #{current_user.inspect}"

        result = PaymentService.new(
          user: current_user,
          membership_type: payment_params[:membership_type],
          payment_method: payment_params[:payment_method]
        ).process

        puts "PaymentService Result: #{result.inspect}"

        if result[:success]
          render_success(
            message: "Payment processed successfully",
            data: {
              payment: PaymentSerializer.new(result[:payment]).as_json,
              membership: MembershipSerializer.new(result[:membership]).as_json
            },
            status: :created
          )
        else
          render json: {
            success: false,
            error: {
              message: result[:error] || "Payment processing failed",
              code: "PAYMENT_FAILED"
            },
            data: result[:payment] ? { payment: PaymentSerializer.new(result[:payment]).as_json } : nil
          }, status: :unprocessable_entity
        end
      end

      def index
        payments = current_user.payments.order(created_at: :desc)

        render_collection(payments, serializer: PaymentSerializer)
      end

      def show
        payment = current_user.payments.find(params[:id])

        render_resource(payment, serializer: PaymentSerializer)
      end

      private

      def payment_params
        params.require(:payment).permit(:membership_type, :payment_method)
      end
    end
  end
end
