module ResponseRenderer
  extend ActiveSupport::Concern

  private

  def render_success(data: nil, message: nil, status: :ok, meta: nil)
    response = { success: true }
    response[:message] = message if message
    response[:data] = data if data
    response[:meta] = meta if meta

    render json: response, status: status
  end

  def render_error(message:, status:, code: nil, details: nil)
    response = {
      success: false,
      error: {
        message: message,
        code: code
      }.compact
    }
    response[:error][:details] = details if details

    render json: response, status: status
  end

  def render_collection(records, serializer:, meta: nil)
    data = records.map { |record| serializer.new(record).as_json }
    render_success(data: data, meta: meta)
  end

  def render_resource(record, serializer:, status: :ok)
    render_success(data: serializer.new(record).as_json, status: status)
  end
end
